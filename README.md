

![npm](https://img.shields.io/npm/v/tasklike-promise-library)

# tasklike-promise-library

A .NET-Task-like Promise extension library for JavaScript. It relieves some of the pain caused by the feature gap of current [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) infrastructure in a .NET Task Parallel Library fashion, such as

* `Promise` cooperative cancellation with `ICancellationToken`.
* `Promise` that resolves after certain period of time (`delay`).
* `Promise` that can be resolved/rejected/cancelled from outside (`PromiseResolutionSource`).
* Some cancellable asynchronous operations, such as asynchronous XHR (`sendRequest`).

Please note that this library depends on ES6 `Promise` (e.g. constructor, `Promise.resolve`, `Promise.reject`) to work, and we does not provide `Promise` polyfill here. If you need such thing, please get yourself a polyfill first. ([`core-js`](https://github.com/zloirock/core-js) is a nice one.)

## Installation

This package contains TS definitions itself, so using one of the the following lines is enough

```powershell
npm install --save tasklike-promise-library
# or
yarn add tasklike-promise-library
```

## Example

See the `example` folder.

[Live example coming soon!]

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

### awaitable XHR

```typescript
async function fetchStatus(ct?: ICancellationToken) {
    const response = await sendRequest({ url: "/api/v1/status", method: "GET" }, ct);
    response.ensureSuccessfulStatusCode();
    const root: IStatusRoot = JSON.parse(response.xhr.responseText);
    return root.status;
}
```



## Build and test

You need `yarn` to build this repository properly.

```powershell
# in repository root
PS /> yarn install
# build repository
PS /> yarn build
PS /> cd sample
# starts a sample HTTP page on localhost
PS /sample> yarn run start
PS /sample> cd ../packages/tasklike-promise-library
# start tsc watch
PS /packages/tasklike-promise-library> yarn run watch
```

