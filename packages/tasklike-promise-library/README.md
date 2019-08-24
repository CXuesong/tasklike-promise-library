

[![npm](https://img.shields.io/npm/v/tasklike-promise-library)](https://www.npmjs.com/package/tasklike-promise-library)

# tasklike-promise-library

A .NET-Task-like Promise extension library for JavaScript. It relieves some of the pain caused by the feature gap of current [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) infrastructure in a .NET Task Parallel Library fashion, such as

* `Promise` [cooperative cancellation](https://docs.microsoft.com/en-us/dotnet/standard/parallel-programming/task-cancellation) with `ICancellationToken`.
* `Promise` that resolves after certain period of time (`delay`).
* `Promise` that can be resolved/rejected/cancelled from outside, somewhat like `Deferred`  or `$.Deferred` (`PromiseResolutionSource`).
* Some cancellable asynchronous operations, such as asynchronous XHR (`sendRequest`).

Please note that this library depends on ES6 `Promise` (e.g. constructor, `Promise.resolve`, `Promise.reject`) to work, and we does not provide `Promise` polyfill here. If you need such thing, please get yourself a polyfill first. ([`core-js`](https://github.com/zloirock/core-js) is a nice one.)

## Installation

This package contains TS definitions itself, so using one of the the following lines is enough

```powershell
npm install --save tasklike-promise-library
# or
yarn add tasklike-promise-library
```

## Documentation

[API documentation is here.](https://cxuesong.github.io/tasklike-promise-library/docs/)

## Example

See the `example` folder. [Live example is here.](https://cxuesong.github.io/tasklike-promise-library/sample/)

### `delay`

```typescript
import { delay, ICancellationToken } from "tasklike-promise-library";

async function doSomeWork(ct?: ICancellationToken) {
    ct.throwIfCancellationRequested();
    // do something
    await delay(1000, ct);
    // do something else
}
```

### Awaitable XHR

```typescript
import { ICancellationToken, sendRequest } from "tasklike-promise-library";

async function fetchStatus(ct?: ICancellationToken) {
    const response = await sendRequest({ url: "/api/v1/status", method: "GET" }, ct);
    response.ensureSuccessfulStatusCode();
    const root: IStatusRoot = JSON.parse(response.xhr.responseText);
    return root.status;
}
```

### Awaitable `setTimeout`/`requestAnimationFrame`/`requestIdleCallback`

```typescript
import { ICancellationToken, requestAnimationFrameAsync } from "tasklike-promise-library";

async function playAnimation(cancellationToken?: ICancellationToken): Promise<void> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    let prevTime = performance.now();
    let currentWidth = 0;
    const panel = document.querySelector("div.panel");
    while (!cancellationToken || !cancellationToken.isCancellationRequested) {
        const animationFrame = await requestAnimationFrameAsync(cancellationToken);
        // From now on, we are inside RAF callback.
        // `animationFrame` contains the information passed from RAF callback,
        // basically, the start time of the animation frame.
        // Make some animation here.
        const frameDuration = animationFrame.time - prevTime;
        // Let the width of .panel increase by 10 pixel/sec.
        currentWidth += frameDuration * 10 * frameDuration / 1000;
        panel.styles.with = Math.round(currentWidth) + "px";
        prevTime = animationFrame.time;
        // End of RAF callback.
        // (More precisely, the callback stop at the next `await requestAnimationFrameAsync` expression.)
    }
}
```

## Build and test

You will need `yarn` and PowerShell Core `pwsh` to build this repository properly.

```powershell
# in repository root
PS /> yarn install
# build repository
PS /> yarn run build
PS /> cd sample
# starts a sample HTTP page on localhost
PS /sample> yarn run start
PS /sample> cd ../packages/tasklike-promise-library
# start tsc watch
PS /packages/tasklike-promise-library> yarn run watch
```

*[TODO: Set up unit test framework.]*
