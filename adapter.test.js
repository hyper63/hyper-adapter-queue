import { assert, assertEquals, createHyperVerify, validateQueueAdapterSchema } from './dev_deps.js'
import { DB } from './deps.js'

import adapter from './adapter.js'

const test = Deno.test
const db = new DB('./test/hyper-queue.db')
const a = adapter({ db })

test('adapter', async (t) => {
  await t.step('all', async (t) => {
    await t.step('should implement the port', () => {
      assert(validateQueueAdapterSchema(a))
    })

    await t.step({
      name: 'should return an error if queue is not found',
      async fn() {
        const res = await a.post({ name: 'queue_dne', job: { foo: 'bar' } })
        assert(!res.ok)
        assertEquals(res.status, 404)
      },
    })
  })

  await t.step('create', async (t) => {
    await t.step({
      name: 'should create the queue',
      async fn() {
        const result = await a.create({
          name: 'testCreate',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        assert(result.ok)
        // cleanup
        await a.delete('testCreate')
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return error if queue already exists',
      async fn() {
        await a.create({
          name: 'testCreate',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })

        const res = await a.create({
          name: 'testCreate',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        assert(!res.ok)
        assertEquals(res.status, 409)
        // cleanup
        await a.delete('testCreate')
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('delete', async (t) => {
    await t.step({
      name: 'should delete the queue',
      async fn() {
        // setup
        await a.create({
          name: 'testDelete',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        // test
        const result = await a.delete('testDelete')
        assert(result.ok)
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return error if queue does not exist',
      async fn() {
        // test
        const res = await a.delete('testDelete')
        assert(!res.ok)
        assertEquals(res.status, 404)
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('index', async (t) => {
    await t.step({
      name: 'should list the queues',
      async fn() {
        // setup
        await a.create({ name: 'testList', target: 'https://x.com' })
        // test
        const result = await a.index()
        //console.log(result);
        assertEquals(result.length, 1)
        // cleanup
        await a.delete('testList')
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return an empty array',
      async fn() {
        // test
        const result = await a.index()
        assertEquals(result.length, 0)
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('post', async (t) => {
    await t.step({
      name: 'should post the job signed with the secret',
      async fn() {
        const secret = 'secret'
        const hyperVerify = createHyperVerify(secret)

        const _fetch = globalThis.fetch
        globalThis.fetch = async (_url, options) => {
          assert(options.headers['X-HYPER-SIGNATURE'])
          assert(
            hyperVerify(
              options.headers['X-HYPER-SIGNATURE'],
              await new Response(options.body).json(),
            ).ok,
          )
          return Promise.resolve({ ok: true })
        }

        // setup
        await a.create({
          name: 'testPost',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret,
        })
        const result = await a.post({
          name: 'testPost',
          job: { hello: 'world' },
        })
        assert(result.ok)
        assert(result.id)
        // clean up
        await a.delete('testPost')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should post the job NOT signed with the secret',
      async fn() {
        const _fetch = globalThis.fetch
        globalThis.fetch = (_url, options) => {
          assert(!options.headers['X-HYPER-SIGNATURE'])
          return Promise.resolve({ ok: true })
        }

        // setup
        await a.create({
          name: 'testPost',
          target: 'https://jsonplaceholder.typicode.com/posts',
        })
        const result = await a.post({
          name: 'testPost',
          job: { hello: 'world' },
        })
        assert(result.ok)
        assert(result.id)
        // clean up
        await a.delete('testPost')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('get', async (t) => {
    await t.step({
      name: 'should get jobs with status error',
      async fn() {
        // setup
        const _fetch = globalThis.fetch
        globalThis.fetch = () => Promise.resolve({ ok: false })
        await a.create({
          name: 'testGet',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        await a.post({
          name: 'testGet',
          job: { hello: 'world' },
        })
        // test
        await new Promise((r) => setTimeout(r, 500))
        const result = await a.get({ name: 'testGet', status: 'ERROR' })
        assert(result.ok)
        assert(result.jobs.length)

        // clean up
        await a.delete('testGet')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return an empty list if no jobs with status are found',
      async fn() {
        // setup
        const _fetch = globalThis.fetch
        globalThis.fetch = () => Promise.resolve({ ok: true })
        await a.create({
          name: 'testGet',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        await a.post({
          name: 'testGet',
          job: { hello: 'world' },
        })
        // test
        await new Promise((r) => setTimeout(r, 500))
        const result = await a.get({ name: 'testGet', status: 'ERROR' })
        assert(result.ok)
        assertEquals(result.jobs.length, 0)

        // clean up
        await a.delete('testGet')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('retry', async (t) => {
    await t.step({
      name: 'should retry the job',
      async fn() {
        // setup
        const _fetch = globalThis.fetch
        globalThis.fetch = () => Promise.resolve({ ok: false })
        await a.create({
          name: 'testRetry',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        await a.post({
          name: 'testRetry',
          job: { hello: 'world' },
        })
        // test
        await new Promise((r) => setTimeout(r, 500))
        const { jobs } = await a.get({ name: 'testRetry', status: 'ERROR' })
        const job = jobs[0]
        const result = await a.retry({ name: 'testRetry', id: job._id })

        assert(result.ok)

        // clean up
        await a.delete('testRetry')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return an error if the job is not found',
      async fn() {
        // setup
        await a.create({
          name: 'testRetry',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        // test
        const result = await a.retry({ name: 'testRetry', id: 'DNE' })

        assert(!result.ok)
        assertEquals(result.status, 404)

        // clean up
        await a.delete('testRetry')
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })

  await t.step('cancel', async (t) => {
    await t.step({
      name: 'should cancel the job',
      async fn() {
        // setup
        const _fetch = globalThis.fetch
        globalThis.fetch = () => Promise.resolve({ ok: false })
        await a.create({
          name: 'testCancel',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        await a.post({
          name: 'testCancel',
          job: { hello: 'world' },
        })
        // test
        await new Promise((r) => setTimeout(r, 500))
        const { jobs } = await a.get({ name: 'testCancel', status: 'ERROR' })
        const job = jobs[0]
        const result = await a.cancel({ name: 'testCancel', id: job._id })

        assert(result.ok)

        // clean up
        await a.delete('testCancel')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })

    await t.step({
      name: 'should return an error if not job is found',
      async fn() {
        // setup
        const _fetch = globalThis.fetch
        globalThis.fetch = () => Promise.resolve({ ok: true })
        await a.create({
          name: 'testCancel',
          target: 'https://jsonplaceholder.typicode.com/posts',
          secret: 'secret',
        })
        const res = await a.post({
          name: 'testCancel',
          job: { hello: 'world' },
        })
        // test
        await new Promise((r) => setTimeout(r, 500))
        const result = await a.cancel({ name: 'testCancel', id: res.id })

        assert(!result.ok)
        assertEquals(result.status, 404)

        // clean up
        await a.delete('testCancel')
        globalThis.fetch = _fetch
      },
      sanitizeResources: false,
      sanitizeOps: false,
    })
  })
})
