import { Queue, R } from "./deps.js";

const { pluck, omit } = R;
const queue = new Queue();
const [SUCCESS, ERROR, READY, JOB, QUEUE, NAME, T] = [
  "SUCCESS",
  "ERROR",
  "READY",
  "job",
  "queue",
  "name",
  true,
];

/**
 * TODO: handle some errors
 */
export default function ({ db }) {
  function index() {
    return db.find({ type: QUEUE })
      .then(pluck(NAME));
  }

  function create({ name, target, secret }) {
    return db
      .insert({ type: QUEUE, _id: name, name, target, secret })
      .then((doc) => ({ ok: T, id: doc._id }));
  }

  function doDelete(name) {
    return db
      .removeOne({ _id: name })
      .then((_doc) => ({ ok: T }));
  }

  async function post({ name, job }) {
    job = { queue: name, type: JOB, ...job, status: READY };
    // get queue data
    const q = await db.findOne({ _id: name });
    // store job doc to db
    job = await db.insert(job);
    // create job post function
    // push job post function to queue
    queue.push(async () =>
      await postJob(q, job)
        .then((result) =>
          db.updateOne({ _id: job._id }, { $set: { status: result.status } })
        )
        .catch(() =>
          db.updateOne({ _id: job._id }, { $set: { status: ERROR } })
        )
    );
    // return success response
    return Promise.resolve({ ok: true, id: job._id });
  }

  async function get({ name, status }) {
    return await db.find({ type: JOB, queue: name, status })
      .then((jobs) => ({ ok: T, jobs }));
  }

  async function retry({ name, id }) {
    const job = await db.findOne({ _id: id, type: JOB, queue: name });
    const q = await db.findOne({ type: QUEUE, _id: name });

    queue.push(async () =>
      await postJob(q, job)
        .then((result) =>
          db.updateOne({ _id: job._id }, { $set: { status: result.status } })
        )
        .catch(() =>
          db.updateOne({ _id: job._id }, { $set: { status: ERROR } })
        )
    );
    return Promise.resolve({ ok: T });
  }

  async function cancel({ name, id }) {
    return await db.removeOne({ _id: id, type: JOB, queue: name })
      .then(() => ({ ok: T }));
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

function postJob(q, job) {
  const body = omit(["_id", "status"], job);
  return fetch(q.target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((res) => res.ok ? ({ status: SUCCESS }) : ({ status: ERROR }));
}
