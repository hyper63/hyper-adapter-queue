import { assert, validateFactorySchema } from "./dev_deps.js";

import factory from "./mod.js";

Deno.test("should be a valid schema", () => {
  assert(validateFactorySchema(factory()));
});

Deno.test("should accept a string", () => {
  assert(factory("test/hyper-foo.db").load());
});

Deno.test("should accept an object with defaults", () => {
  assert(factory({ dir: "test" }).load());
  assert(factory({ dir: "test", name: "foo.db" }).load());
});
