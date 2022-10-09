import { assert, validateFactorySchema } from "./dev_deps.js";

import factory from "./mod.js";

Deno.test({
  name: "should be a valid schema",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    assert(validateFactorySchema(factory()));
  },
});

Deno.test({
  name: "should accept a string",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    assert(factory("test/hyper-foo.db").load());
  },
});

Deno.test({
  name: "should accept an object with defaults",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: () => {
    assert(factory({ dir: "test" }).load());
    assert(factory({ dir: "test", name: "foo.db" }).load());
  },
});
