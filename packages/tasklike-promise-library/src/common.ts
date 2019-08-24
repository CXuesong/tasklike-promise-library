/**
 * @module
 * Contains common utility functions for `Promise`.
 */
/** */
import { ICancellationToken, PromiseCancelledError } from "./primitives/cancellation";
import { PromiseResolutionSource } from "./primitives/promiseResolutionSource";

const _yieldedPromise = Promise.resolve();

/**
 * Gets a `Promise` that resolves after the specified time of delay.
 * @param milliseconds non-negative time in milliseconds to wait before the returned `Promise` resolves.
 * @param cancellationToken a token used to cancel the returned `Promise`.
 * @see {@link yielded}
 * @todo make this function also works in nodejs.
 */
export function delay(milliseconds: number, cancellationToken?: ICancellationToken): Promise<void> {
    if (milliseconds < 0) {
        throw new RangeError("milliseconds (arg#1) should be a non-negative number.");
    }
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const prs = new PromiseResolutionSource();
    // TODO make setTimeout injectable.
    const id = setTimeout(() => { prs.tryResolve(); }, milliseconds);
    if (cancellationToken) {
        cancellationToken.subscribe(() => {
            clearTimeout(id);
            prs.tryReject(new PromiseCancelledError());
        });
    }
    return prs.promise;
}

/**
 * Returns a `PromiseLike` instance that, when used with `await` expression,
 * asynchronously yields back to the code below. The instance returned behaves
 * like the returned value of `Promise.resolve()`.
 * 
 * Note: The major difference between `yielded()` and `delay(0)`, is that `delay` will
 * resolve the returned `Promise` in a `setTimeout` callback, even if the delay time is `0`.
 * This will cause `Promise` returned by `delay` be *resolved* in marcoTask queue on some execution engine.
 * 
 * @see {@link delay}
 */
export function yielded(): PromiseLike<void> {
    return _yieldedPromise;
}

/**
 * Gets a resolved `Promise`.
 * This function behaves the same as `Promise.resolve`.
 * @param result the result of the resolved `Promise`.
 */
export function fromResolved<T = void>(result: T | PromiseLike<T>): Promise<T> {
    return Promise.resolve(result);
}

/**
 * Gets a rejected `Promise`.
 * This function behaves the same as `Promise.reject`.
 * @param reason the rejection reason, or the `Error` causing the rejection.
 */
export function fromRejected<T = void>(reason: any): Promise<T> {
    return Promise.reject<T>(reason);
}

/**
 * Gets a cancelled `Promise`.
 * 
 * A cancelled `Promise` is a `Promise` rejected with {@link PromiseCancelledError}.
 */
export function fromCancelled<T = void>(): Promise<T> {
    // We want to capture the stack trace.
    return Promise.reject<T>(new PromiseCancelledError());
}
