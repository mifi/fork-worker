# fork-worker

Makes it easier to fork off a separate Node.js worker with a heavy job or some code you don't trust the stability of (maybe a high risk of crashing the whole node process, like a native module). `fork-worker` lets you run a js file outside the calling process (uses `child_process.fork` internally). It will make sure that the process is killed when done, and returns a promise for ease of use.

## Install

```
npm install fork-worker
```

## Usage

### Signature
```
forkWorker(modulePath, message, timeout, forkOpts) -> Promise|ChildProcess
```

`modulePath` (required) - Passed to `child_process.fork`

`message` (optional) - Message to appear in `process.on('message', (message) => { ... })` in the worker. Must be serializable.

`timeout` (optional) - If specified and the process has not called `process.send` within this time, the process will be killed and the promise will be rejected. Default: `undefined`

`forkOpts: { args, options }` (optional) - Passed on to `child_process.fork()`

### Return value

A `Promise` which will be resolved when the worker posts a message (resolved with the message.) The promise will be rejected if the process exits without sending a message, times out, crashes, or reports an error. The returned promise is also a `ChildProcess` class (from `child_process.fork()`).

## Example

### worker.js
```javascript
const riskyOperation = require('some-heavy-or-unstable-module');

process.on('message', async (inData) => {
  try {
    const data = await riskyOperation(inData)
    process.send({ data })
  } catch (err) {
    // Important that we catch async errors because unhandled promise rejections will not terminate Node.js.
    console.log('worker error', err)
    process.send({ error: 'Something went wrong' })
  }
});

```

### index.js
```javascript
const forkWorker = require('fork-worker');

async function safelyRunRiskyOperation(inData) {
  try {
    const response = await forkWorker('./worker.js', inData, 10000);
    if (response.error) throw new Error('Worker reported error')
    return response.data;
  } catch (err) {
    console.log('Worker error' ,err)
  }
}

```

## See also
- [child_process documentation](https://nodejs.org/api/child_process.html).
- https://github.com/avoidwork/tiny-worker
