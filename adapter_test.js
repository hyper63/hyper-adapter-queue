import { assert, assertEquals } from './dev_deps.js'
import { Datastore } from './deps.js'

import adapter from './adapter.js'

const test = Deno.test
const db = new Datastore({ filename: '/tmp/hyper-queue.db', autoload: true })
const a = adapter({ db })

test('create queue', async () => {
  const result = await a.create({
    name: 'testQ',
    target: 'https://jsonplaceholder.typicode.com/posts',
    secret: 'secret'
  })
  assert(result.ok)
})

test('delete queue', async () => {
  const result = await a.delete('testQ')
  assert(result.ok)
})

test('list queues', async () => {
  const result = await a.index()
  console.log(result)
  assertEquals(result.length, 0)
})