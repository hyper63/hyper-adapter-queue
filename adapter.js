// deno-lint-ignore-file no-unused-vars

export default function (_env) {
  
  async function index () {
    // TODO
    return Promise.resolve([])
  }
  
  async function create({name, target, secret}) {
    // TODO
    return Promise.resolve({ok: true})
  }

  async function doDelete(name) {
    return Promise.resolve({ok: true})
  }

  async function post({name, job}) {
    // TODO
    return Promise.resolve({ok: true})
  }

  async function get({name, status}) {
    // TODO
    return Promise.resolve({ok: true, jobs: []})
  }

  async function retry({name, id}) {
    return Promise.resolve({ok: true})
  }

  async function cancel({name, id}) {
    return Promise.resolve({ok: true})
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
