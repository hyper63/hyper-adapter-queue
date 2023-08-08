<h1 align="center">hyper-adapter-queue</h1>
<p align="center">The hyper queue service allows the hyper client to create queues,
setting up a webhook endpoint to be invoked everytime a job is posted to the queue.
This service can provide worker push queues to serverless applications, without having
to manage state. This adapter uses an in-memory queue and is designed to work with
local hyper services or services with small workloads.</p>

<p align="center">
  <a href="https://nest.land/package/hyper-adapter-queue"><img src="https://nest.land/badge.svg" alt="Nest Badge" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-queue/actions/workflows/test-and-publish.yml"><img src="https://github.com/hyper63/hyper-adapter-queue/actions/workflows/test-and-publish.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-queue/tags/"><img src="https://img.shields.io/github/tag/hyper63/hyper-adapter-queue" alt="Current Version" /></a>
</p>

---

## Table of Contents

- [Getting Started](#getting-started)
- [Example](#example)
- [Testing](#testing)
- [Contributings](#contributing)
- [License](#license)

---

## Getting Started

In order to get started using `hyper-adapter-queue`, you need to setup a hyper instance:

```js
import { default as app } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-app-express%40v1.2.0/packages/app-express/mod.ts'
import { default as hyper } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper%40v4.2.0/packages/core/mod.ts'

import { default as queue } from 'https://raw.githubusercontent.com/hyper63/hyper-adapter-queue/v0.3.0/mod.js'

const hyperConfig = {
  app,
  adapters: [
    { port: 'queue', plugins: [queue({ dir: '.', name: 'hyper-queue.db' })] },
  ],
}

hyper(hyperConfig)
```

> if no options are passed to the adapter, then a sqlite db `hyper-queue.db` will be placed into the
> cwd

## Example

// create a queue

```js
const hyper = 'https://<hyper-host>/queue/<queue-name>'
fetch(hyper, {
  method: 'PUT',
  body: JSON.stringify({
    target: 'https://jsonplaceholder.typicode.com/posts',
    secret: 'shhhh',
  }),
}) // { ok: true }
```

// post a job to the queue

```js
const hyper = 'https://<hyper-host>/queue/<queue-name>'
fetch(hyper, {
  method: 'POST',
  body: JSON.stringify({
    hello: 'world',
  }),
}) // { ok: true, id: 123 }
```

// fetch queued jobs

```js
const hyper = 'https://<hyper-host>/queue/<queue-name>' + new URLSearchParams({ status: 'READY' })
fetch(hyper) // { ok: true, jobs: [] }
```

// fetch errored jobs (DLQ)

```js
const hyper = 'https://<hyper-host>/queue/<queue-name>' + new URLSearchParams({ status: 'ERROR' })
fetch(hyper) // { ok: true, jobs: [] }
```

## Testing

Run Tests

```sh
deno task test
```

Run Test Harness

```sh
deno task test:harness
```

## Contributing

Contributions are welcome!

## License

Apache 2.0
