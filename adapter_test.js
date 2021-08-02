import { assert, assertEquals } from "./dev_deps.js";
import { Datastore } from "./deps.js";

import adapter from "./adapter.js";

const test = Deno.test;
const db = new Datastore({ filename: "/tmp/hyper-queue.db", autoload: true });
const a = adapter({ db });

test("create queue", async () => {
  const result = await a.create({
    name: "testCreate",
    target: "https://jsonplaceholder.typicode.com/posts",
    secret: "secret",
  });
  assert(result.ok);
  // cleanup
  await a.delete('testCreate')
});

test("delete queue", async () => {
  // setup
  await a.create({
    name: "testDelete",
    target: "https://jsonplaceholder.typicode.com/posts",
    secret: "secret",
  });
  // test
  const result = await a.delete("testDelete");
  assert(result.ok);


});

test("list queues", async () => {
  // setup
  await a.create({ name: 'testList', target: 'https://x.com' })
  // test
  const result = await a.index();
  console.log(result);
  assertEquals(result.length, 1);
  // cleanup
  await a.delete('testList')
});

test({ name: 'postjob', async fn() {
  // setup
  await a.create({
    name: 'testPost',
    target: 'https://jsonplaceholder.typicode.com/posts',
    secret: 'secret'
  })
  const result = await a.post({
    name: 'testPost', job: { hello: 'world' }
  })
  // clean up
  await a.delete('testPost')
}, 
  sanitizeResources: false,
  sanitizeOps: false
})
