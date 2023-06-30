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

mod.js file:

```js
import { core } from 'https://x.nest.land/hyper@1.4.2/mod.js'
import config from './hyper.config.js'

core(config)
```

config file:

```js
import { opine } from "https://x.nest.land/hyper-app-opine@1.2.1/mod.js";
import queue from "https://x.nest.land/hyper-adapter-queue@0.0.1/mod.js";

export default = {
  app: opine,
  adapters: [
    { port: 'queue', plugins: [queue('/tmp/hyper-queue.db')] },
  ],
};
```

Alternatively, you can pass an object containing a `dir` field

## Example

// create a queue

```js
const hyper = 'https://cloud.hyper.io/apps/test/queue/default'
fetch(hyper, {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    target: 'https://jsonplaceholder.typicode.com/posts',
  }),
})
```

// post a job

```js
const hyper = 'https://cloud.hyper.io/apps/test/queue/default'
fetch(hyper, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    hello: 'world',
  }),
})
```

## Testing

Run Tests...

```sh
./scripts/test.sh
```

Run Test Harness

```sh
./scripts/harness.sh
```

## Contributing

Contributions are welcome!

## License

Apache 2.0
