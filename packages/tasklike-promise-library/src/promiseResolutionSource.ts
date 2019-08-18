import { PromiseCancelledError } from "./cancellation";

/**
 * Resolves or rejects a `Promise` from outside of it.
 */
export class PromiseResolutionSource<T = void> {
    private _promise: Promise<T> | undefined;
    // Though we won't let v be `undefined` here.
    // https://github.com/microsoft/TypeScript/pull/22772
    private _resolve: ((v: T | PromiseLike<T>) => void) | undefined;
    private _reject: ((e: any) => void) | undefined;
    private _ensurePromiseInitialized() {
        if (this._promise == null) {
            this._promise = new Promise((res, rej) => {
                this._resolve = res;
                this._reject = rej;
            });
        }
    }
    /** Gets the derived `Promise` controlled by the current instance. */
    public get promise(): Promise<T> {
        this._ensurePromiseInitialized();
        return this._promise!;
    }
    /**
     * Resolves the derived `Promise` with the specified result.
     * @param result the resolution result, or a `PromiseLike` that can be furtherly *resolved*.
     * @returns `true` if the derived `Promise` has just been *resolved*;
     * otherwise it means the `Promise` has already been *settled* before.
     */
    public tryResolve(result: T | PromiseLike<T>): boolean {
        this._ensurePromiseInitialized();
        if (this._resolve) {
            this._resolve(result);
            this._resolve = this._reject = undefined;
            return true;
        }
        return false;
    }
    /**
     * Cancels the derived `Promise`.
     * @returns `true` if the derived `Promise` has just been *rejected* with `PromiseCancelledError`;
     * otherwise it means the `Promise` has already been *settled* before.
     */
    public tryCancel(): boolean {
        this._ensurePromiseInitialized();
        if (this._reject) {
            this._reject(new PromiseCancelledError());
            this._resolve = this._reject = undefined;
            return true;
        }
        return false;
    }
    /**
     * Rejects the derived `Promise` with the specified rason.
     * @param reason the rejection reason, or the `Error` causing the rejection.
     * @returns `true` if the derived `Promise` has just been *rejected*;
     * otherwise it means the `Promise` has already been *settled* before.
     */
    public tryReject(reason: any): boolean {
        this._ensurePromiseInitialized();
        if (this._reject) {
            this._reject(reason);
            this._resolve = this._reject = undefined;
            return true;
        }
        return false;
    }
}
