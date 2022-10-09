import { crocks, HyperErr, isHyperErr, Queue, R } from "./deps.js";

const { Async } = crocks;
const {
  tap,
  pluck,
  ifElse,
  filter,
  compose,
  zipObj,
  evolve,
  always,
  identity,
  head,
  map,
  assoc,
  omit,
} = R;
const queue = new Queue();

const handleHyperErr = ifElse(
  isHyperErr,
  Async.Resolved,
  Async.Rejected,
);

const [TABLE, SUCCESS, ERROR, READY, JOB, QUEUE] = [
  "hyper_adapter_queue",
  "SUCCESS",
  "ERROR",
  "READY",
  "job",
  "queue",
];

const xQueue = compose(
  filter((v) => !!v),
  evolve({
    id: identity,
    queue: identity,
    target: identity,
    secret: identity,
    timestmp: identity,
  }),
  zipObj(["id", "queue", "target", "secret", "timestmp"]),
);

const xJob = compose(
  // id => _id
  compose(
    omit(["id"]),
    (doc) => assoc("_id", doc.id, doc),
  ),
  evolve({
    id: identity,
    queue: identity,
    status: identity,
    job: (v) => JSON.parse(v),
    timestmp: identity,
  }),
  zipObj(["id", "job", "status", "queue", "timestmp"]),
);

export default function ({ db }) {
  const query = Async.fromPromise(async (...args) =>
    await db.query.bind(db)(...args)
  );

  /**
   * Use one table for everything
   *
   * rows with type 'queue' will contain name, target, secret, and timestmp
   *
   * rows with type 'job' will contain job, status, and timestmp
   *
   * memoized, so this call will only be made once, then
   * the result cached
   */
  const findOrCreateTable = (() => {
    let created = false;
    return () => {
      if (created) return Async.Resolved();
      return query(`CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        timestmp TEXT,

        queue TEXT,
        target TEXT,
        secret TEXT,

        job TEXT,
        status TEXT
      )`).map(tap(() => created = true));
    };
  })();

  /**
   * Resolves to queue object
   * Rejects if not found
   */
  const findQueue = (name) =>
    query(
      `SELECT id, queue, target, secret, timestmp from ${TABLE} where type = ? AND queue = ?`,
      [QUEUE, name],
    )
      .map(head)
      .chain(ifElse(
        identity,
        compose(
          Async.Resolved,
          xQueue,
        ),
        () => Async.Rejected(HyperErr({ status: 404, msg: "queue not found" })),
      ));

  /**
   * Resolves to a list of jobs
   *
   * If id is provided, then will also query by id
   * which will return list of length 1 or 0 (if not found)
   */
  const findJobs = ({ name, id, status }) => {
    const maybeCriteria = (col, value) =>
      ifElse(
        always(value),
        // Add id parameter
        ([query, params]) => [`${query} AND ${col} = ?`, [...params, value]],
        // do nothing
        identity,
      );

    return Async.of([
      `SELECT id, job, status, queue, timestmp from ${TABLE} where type = ? AND queue = ?`,
      [
        JOB,
        name,
      ],
    ]).map(maybeCriteria("status", status))
      .map(maybeCriteria("id", id))
      .chain((args) => query(...args))
      .map(map(xJob));
  };

  const queueJob = (q, job, id) =>
    Async((reject, resolve) => {
      queue.push(
        () =>
          Async.of()
            .chain(() =>
              Async.fromPromise(fetch)(q.target, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(job),
              })
            )
            .bichain(
              () => Async.Rejected({ status: ERROR }),
              (res) =>
                res.ok
                  ? Async.Resolved({ status: SUCCESS })
                  : Async.Rejected({ status: ERROR }),
            ).bichain(
              // Job errored, so keep in persistence
              ({ status }) =>
                query(`UPDATE ${TABLE} SET status = ? WHERE id = ?`, [
                  status,
                  id,
                ]),
              // Job was successful, so remove
              () => query(`DELETE FROM ${TABLE} where id = ?`, [id]),
            )
            .bimap(reject, resolve)
            /**
             * queue expects a promise, so unwrap the inner Async,
             * which resolves the outer Async
             */
            .toPromise(),
      );
    }).toPromise();

  function index() {
    return findOrCreateTable()
      .chain(() =>
        query(
          `SELECT id, queue, target, secret, timestmp from ${TABLE} where type = ?`,
          [QUEUE],
        )
      )
      .map(map(xQueue))
      .map(pluck("queue"))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  function create({ name, target, secret }) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      // Happy path is reversed for create
      .bichain(
        Async.Resolved,
        () =>
          Async.Rejected(
            HyperErr({ status: 409, msg: "queue already exists" }),
          ),
      )
      // Create queue record
      .chain(() =>
        query(
          `INSERT INTO ${TABLE} (type,queue,target,secret,timestmp) VALUES (?, ?, ?, ?, ?)`,
          [QUEUE, name, target, secret, new Date().toISOString()],
        )
      )
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  function doDelete(name) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      .bichain(
        () => Async.Rejected(HyperErr({ status: 404, msg: "queue not found" })),
        // Delete queue record and any jobs associated
        () =>
          query(
            `DELETE FROM ${TABLE} WHERE queue = ?`,
            [name],
          ),
      )
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  function post({ name, job }) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      .chain((queue) => {
        // Persist job
        return query(
          `INSERT INTO ${TABLE} (type,queue,job,status,timestmp) VALUES (?, ?, ?, ?, ?) RETURNING id, job, status, queue, timestmp`,
          [JOB, name, JSON.stringify(job), READY, new Date().toISOString()],
        ).map(compose(xJob, head)).map((j) => {
          // Passively push job to queue
          queueJob(queue, job, j._id);
          return { ok: true, id: j._id };
        });
      })
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  function get({ name, status }) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      .chain(() => findJobs({ name, status }))
      .map((jobs) => ({ ok: true, jobs }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  function retry({ name, id }) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      .chain((queue) =>
        findJobs({ name, id, status: ERROR })
          // Only one job should come back, so grab it
          .map(head)
          .chain(ifElse(
            identity,
            (job) => Async.Resolved({ queue, job }),
            () =>
              Async.Rejected(
                HyperErr({ ok: false, status: 404, msg: "job not found" }),
              ),
          ))
      )
      .map(({ job, queue }) => {
        // Passively push job to queue
        queueJob(queue, job.job, id);
        return { ok: true };
      })
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  function cancel({ name, id }) {
    return findOrCreateTable()
      .chain(() => findQueue(name))
      .chain(() => findJobs({ name, id }))
      // Only one job should come back, so grab it
      .map(head)
      .chain(ifElse(
        identity,
        (job) =>
          query(
            `DELETE FROM ${TABLE} where type = ? AND id = ?`,
            [JOB, job._id],
          ),
        () =>
          Async.Rejected(
            HyperErr({ ok: false, status: 404, msg: "job not found" }),
          ),
      ))
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  return Object.freeze({
    index,
    create,
    "delete": doDelete,
    post,
    get,
    retry,
    cancel,
  });
}
