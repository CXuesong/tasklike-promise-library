
const _resovledPromise = Promise.resolve();

export function resolvedPromise(): Promise<void> {
    return _resovledPromise;
}

export function delay(milliseconds: number): Promise<void> {
    if (milliseconds < 0) {
        throw new RangeError("milliseconds (arg#1) should be a non-negative number.")
    }
    if (milliseconds === 0) {
        return _resovledPromise;
    }
    const prs = new PromiseResolutionSource();
    setTimeout(function (prs_: PromiseResolutionSource) { prs_.tryResolve(); }, milliseconds);
    return prs.promise;
}

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
            })
        }
    }
    public get promise(): Promise<T> {
        this._ensurePromiseInitialized();
        return this._promise!;
    }
    public tryResolve(result: T | PromiseLike<T>): boolean {
        this._ensurePromiseInitialized();
        if (this._resolve) {
            this._resolve(result);
            this._resolve = this._reject = undefined;
            return true;
        }
        return false;
    }
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
