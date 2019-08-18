import { ICancellationToken, PromiseCancelledError } from "./cancellation";
import { PromiseResolutionSource } from "./promiseResolutionSource";

const _yieldedPromise = Promise.resolve();

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

export function yielded(): PromiseLike<void> {
    return _yieldedPromise;
}

export function fromResolved<T = void>(result: T | PromiseLike<T>): Promise<T> {
    return Promise.resolve(result);
}

export function fromRejected<T = void>(reason: any): Promise<T> {
    return Promise.reject<T>(reason);
}

export function fromCancelled<T = void>(): Promise<T> {
    // We want to capture the stack trace.
    return Promise.reject<T>(new PromiseCancelledError());
}
