import { assert, assertEquals } from "./dev_deps.js";
import { Datastore } from "./deps.js";

import adapter from "./adapter.js";

const test = Deno.test;
const db = new Datastore({ filename: "/tmp/hyper-queue.db", autoload: true });
const a = adapter({ db });

test({
  name: "create queue",
  async fn() {
    const result = await a.create({
      name: "testCreate",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    assert(result.ok);
    // cleanup
    await a.delete("testCreate");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "delete queue",
  async fn() {
    // setup
    await a.create({
      name: "testDelete",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    // test
    const result = await a.delete("testDelete");
    assert(result.ok);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "list queues",
  async fn() {
    // setup
    await a.create({ name: "testList", target: "https://x.com" });
    // test
    const result = await a.index();
    //console.log(result);
    assertEquals(result.length, 1);
    // cleanup
    await a.delete("testList");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "postjob",
  async fn() {
    // setup
    await a.create({
      name: "testPost",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    const result = await a.post({
      name: "testPost",
      job: { hello: "world" },
    });
    assert(result.ok);
    // clean up
    await a.delete("testPost");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "get jobs with status error",
  async fn() {
    // setup
    const _fetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ ok: false });
    await a.create({
      name: "testGet",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    await a.post({
      name: "testGet",
      job: { hello: "world" },
    });
    // test
    await new Promise((r) => setTimeout(r, 500));
    const result = await a.get({ name: "testGet", status: "ERROR" });
    //console.log(result)
    assert(result.ok);

    // clean up
    await a.delete("testGet");
    globalThis.fetch = _fetch;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "retry job",
  async fn() {
    // setup
    const _fetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ ok: false });
    await a.create({
      name: "testRetry",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    await a.post({
      name: "testRetry",
      job: { hello: "world" },
    });
    // test
    await new Promise((r) => setTimeout(r, 500));
    const { jobs } = await a.get({ name: "testRetry", status: "ERROR" });
    const job = jobs[0];
    const result = await a.retry({ name: "testRetry", id: job._id });

    assert(result.ok);

    // clean up
    await a.delete("testRetry");
    globalThis.fetch = _fetch;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

test({
  name: "cancel job",
  async fn() {
    // setup
    const _fetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ ok: false });
    await a.create({
      name: "testCancel",
      target: "https://jsonplaceholder.typicode.com/posts",
      secret: "secret",
    });
    await a.post({
      name: "testCancel",
      job: { hello: "world" },
    });
    // test
    await new Promise((r) => setTimeout(r, 500));
    const { jobs } = await a.get({ name: "testCancel", status: "ERROR" });
    const job = jobs[0];
    const result = await a.cancel({ name: "testCancel", id: job._id });

    assert(result.ok);

    // clean up
    await a.delete("testCancel");
    globalThis.fetch = _fetch;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
