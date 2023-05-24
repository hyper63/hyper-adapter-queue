import { assert, validateFactorySchema } from './dev_deps.js'

import factory from './mod.js'

Deno.test({
  name: 'mod',
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await t.step({
      name: 'should be a valid schema',
      fn: () => {
        assert(validateFactorySchema(factory()))
      },
    })

    await t.step('load', async (t) => {
      await t.step({
        name: 'should accept a string',
        fn: () => {
          assert(factory('test/hyper-foo.db').load())
        },
      })

      await t.step({
        name: 'should accept an object with defaults',
        fn: () => {
          assert(factory({ dir: 'test' }).load())
          assert(factory({ dir: 'test', name: 'foo.db' }).load())
        },
      })
    })
  },
})
