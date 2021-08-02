// deno-lint-ignore-file no-unused-vars
import { Queue, R } from "./deps.js";

const { pluck, omit } = R
const queue = new Queue()

export default function ({ db }) {
  async function index() {
    return db.find({ type: "queue" })
      .then(pluck('name'));
  }

  async function create({ name, target, secret }) {
    return db
      .insert({ type: "queue", _id: name, name, target, secret })
      .then((doc) => ({ ok: true, _id: doc._id }));
  }

  async function doDelete(name) {
    return db
      .removeOne({ _id: name })
      .then((_doc) => ({ ok: true }));
  }

  async function post({ name, job }) {
    // TODO
    job = { type: 'job', ...job, status: 'READY' }
    // get queue data
    const q = await db.findOne({ _id: name })
    // store job doc to db
    job = await db.insert(job)
    // create job post function
    // push job post function to queue
    queue.push(async () => await postJob(q, job)
      .then(result => db.updateOne({ _id: job._id }, { $set: { status: result.status } }))
      .catch(e => db.updateOne({ _id: job._id }, { $set: { status: 'ERROR' } }))
      .then(console.log.bind(console))
    )
    // return success response
    return Promise.resolve({ ok: true, _id: job._id });
  }

  async function get({ name, status }) {
    // TODO
    return Promise.resolve({ ok: true, jobs: [] });
  }

  async function retry({ name, id }) {
    return Promise.resolve({ ok: true });
  }

  async function cancel({ name, id }) {
    return Promise.resolve({ ok: true });
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

async function postJob(q, job) {
  const body = omit(['_id', 'status'], job)
  return fetch(q.target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(res => res.ok ? ({ status: 'SUCCESS' }) : ({ status: 'ERROR' }))
}