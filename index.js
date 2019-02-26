const childProcess = window.require('child_process');

export default (modulePath, message, timeout, forkOpts = {}) => {
  const { args, options } = forkOpts;
  let cp;

  const promise = new Promise((resolve, reject) => {
    cp = childProcess.fork(modulePath, args, options);

    let haveReturned = false;
    let timeoutRef;

    cp.on('message', (inMessage) => {
      clearTimeout(timeoutRef);
      if (haveReturned) return;
      haveReturned = true;
      resolve(inMessage);
      cp.kill(); // TODO wait for it to exit by itself?
    });

    cp.on('error', (err) => {
      clearTimeout(timeoutRef);
      if (haveReturned) return;
      haveReturned = true;
      reject(err);
      cp.kill();
    });

    cp.on('exit', (code, signal) => {
      clearTimeout(timeoutRef);
      if (haveReturned) return;
      haveReturned = true;
      const err = new Error('Process exited without sending a message');
      err.code = code;
      err.signal = signal;
      reject(err);
    });

    function onTimeout() {
      clearTimeout(timeoutRef);
      if (haveReturned) return;
      haveReturned = true;
      reject(new Error('Timeout'));
    }

    if (timeout) timeoutRef = setTimeout(onTimeout, timeout);

    cp.send(message === undefined ? null : message);
  });

  // https://github.com/sindresorhus/execa/blob/master/index.js#L317
  cp.then = (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected);
  cp.catch = onrejected => promise.catch(onrejected);

  return cp;
};
