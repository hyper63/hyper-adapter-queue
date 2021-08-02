// deno-lint-ignore-file no-unused-vars

export default function ({ db }) {

  async function index() {
    return db.find({})
  }

  async function create({ name, target, secret }) {
    return db
      .insert({ _id: name, name, target, secret })
      .then(doc => ({ ok: true, _id: doc._id }))
  }

  async function doDelete(name) {
    return db
      .removeOne({ _id: name })
      .then(_doc => ({ ok: true }))
  }

  async function post({ name, job }) {
    // TODO
    return Promise.resolve({ ok: true })
  }

  async function get({ name, status }) {
    // TODO
    return Promise.resolve({ ok: true, jobs: [] })
  }

  async function retry({ name, id }) {
    return Promise.resolve({ ok: true })
  }

  async function cancel({ name, id }) {
    return Promise.resolve({ ok: true })
  }

  return Object.freeze({
    index,
    create,
    'delete': doDelete,
    post,
    get,
    retry,
    cancel
  });
}
