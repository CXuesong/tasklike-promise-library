import { ICancellationToken, PromiseCancelledError } from "./cancellation";
import { PromiseResolutionSource } from "./promiseResolutionSource";

const _resovledPromise = Promise.resolve();

export function resolvedPromise(): Promise<void> {
    return _resovledPromise;
}

export function delay(milliseconds: number, cancellationToken?: ICancellationToken): Promise<void> {
    if (milliseconds < 0) {
        throw new RangeError("milliseconds (arg#1) should be a non-negative number.");
    }
    if (milliseconds === 0) {
        return _resovledPromise;
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
