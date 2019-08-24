/**
 * @module
 * Provides `PromiseLike` that can be resolved from outside.
 * @see {@link IConfigurablePromiseLike}
 * @see {@link PromiseResolutionSource}
 */

 /** */
import { PromiseCancelledError } from "./cancellation";
import { PromiseResolutionSource } from "./promiseResolutionSource";

/**
 * Represents a `PromiseLike` that supports further configuration,
 * such as to explicitly execute callbacks asynchronously.
 */
export interface IConfigurablePromiseLike<T> extends PromiseLike<T> {
    /**
     * Gets a `PromiseLike` that ensures the {@link PromiseLike.then} callbacks
     * are executed asynchronously.
     * 
     * @remarks executing the callbacks asynchronsouly may let lose the current execution context,
     * such as going out of an event handler, or an `requestAnimationFrame` callback.
     */
    forceAsync(): PromiseLike<T>;
}

/**
 * Resolves or rejects a `PromiseLike` from outside of it.
 * 
 * This class is significantly different from {@link PromiseResolutionSource}
 * in the way that it ensures when {@link tryResolve}, {@link tryCancel}, or {@link tryReject}
 * is called, the continuation callbacks associated with `PromiseLike` are executed *synchronously*.
 * However, downstream consumers are still able to let their continuation callbacks execute asynchronously.
 * See {@link IConfigurablePromiseLike} for more information.
 * 
 * This class is similar to `Deferred` but it explicitly separates
 * the promise and its control side into two different objects.
 * 
 * @typeparam T type of the promise resolution result.
 */
export class PromiseLikeResolutionSource<T = void> {
    private _promiseLike: undefined | SynchronousPromiseLike<never, T>;
    private _ensurePromiseLikeInitialized(): void {
        if (!this._promiseLike) {
            this._promiseLike = new SynchronousPromiseLike();
        }
    }
    /** Gets the derived `PromiseLike` controlled by the current instance. */
    public get promiseLike(): IConfigurablePromiseLike<T> {
        this._ensurePromiseLikeInitialized();
        return this._promiseLike!;
    }
    /**
     * Synchronously resolves the derived `PromiseLike` with the specified result.
     * @param result the resolution result, or a `PromiseLike` that can be furtherly *resolved*.
     * @returns `true` if the derived `PromiseLike` has just been *resolved*;
     * otherwise it means the `PromiseLike` has already been *settled* before.
     */
    public tryResolve(result: T | PromiseLike<T>): boolean {
        this._ensurePromiseLikeInitialized();
        if (this._promiseLike!.$__int__settled) {
            return false;
        }
        this._promiseLike!.$__int__fulfill(result);
        return true;
    }
    /**
     * Synchronously cancels the derived `PromiseLike`.
     * @returns `true` if the derived `PromiseLike` has just been *rejected* with `PromiseCancelledError`;
     * otherwise it means the `PromiseLike` has already been *settled* before.
     */
    public tryCancel(): boolean {
        this._ensurePromiseLikeInitialized();
        if (this._promiseLike!.$__int__settled) {
            return false;
        }
        this._promiseLike!.$__int__reject(new PromiseCancelledError());
        return true;
    }
    /**
     * Synchronously rejects the derived `PromiseLike` with the specified rason.
     * @param reason the rejection reason, or the `Error` causing the rejection.
     * @returns `true` if the derived `PromiseLike` has just been *rejected*;
     * otherwise it means the `PromiseLike` has already been *settled* before.
     */
    public tryReject(reason: any): boolean {
        this._ensurePromiseLikeInitialized();
        if (this._promiseLike!.$__int__settled) {
            return false;
        }
        this._promiseLike!.$__int__reject(reason);
        return true;
    }
}

type PromiseFulfilledCallback<T, TResult> = ((value: T) => TResult | PromiseLike<TResult>) | undefined | null;
type PromiseRejectedCallback<TResult> = ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null;

class SynchronousPromiseLike<TPrev, TNext> implements IConfigurablePromiseLike<TNext> {
    private next: undefined | SynchronousPromiseLike<TNext, any>[] | "resolved" | "rejected";
    private result: unknown;
    private asnycPrs: undefined | PromiseResolutionSource<TNext>;
    public constructor(private _onfulfilled?: PromiseFulfilledCallback<TPrev, TNext>, private _onrejected?: PromiseRejectedCallback<TNext>) {

    }
    public get $__int__settled(): boolean {
        return typeof this.next === "string";
    }
    // Note: TNext | PromiseLike<TNext> is only used when TPrev == TNext
    public $__int__fulfill(prevResult: TPrev | TNext | PromiseLike<TNext>) {
        if (typeof this.next === "string") {
            console.error("Settled PromiseLike should not be resolved furthermore.", this.next);
            return;
        }
        try {
            if (this._onfulfilled) {
                // fulfill current callback
                const result = this._onfulfilled(prevResult as TPrev);
                // notify next PromiseLike(s)
                this.fulfillNext(result);
            } else {
                this.fulfillNext(prevResult as TNext);
            }
        } catch (error) {
            // Error raised while executing onfulfilled callback.
            // Next PromiseLikes should be rejected.
            if (this._onrejected) {
                this.rejectNext(error);
            }
        }
    }
    public $__int__reject(reason: unknown) {
        if (typeof this.next === "string") {
            console.error("Settled PromiseLike should not be resolved furthermore.", this.next);
            return;
        }
        try {
            if (this._onrejected) {
                const result = this._onrejected(reason);
                this.fulfillNext(result);
            } else {
                this.rejectNext(reason);
            }
        } catch (error) {
            // Error raised while executing onrejected callback.
            // Next PromiseLikes should be rejected.
            if (this._onrejected) {
                this.rejectNext(error);
            } else {
                console.error("Uncaught SynchronousPromiseLike rejection: %o", error);
            }
        }
    }
    private fulfillNext = (nextResult: TNext | PromiseLike<TNext>): void => {
        if (nextResult && typeof nextResult === "object" && typeof (nextResult as PromiseLike<TNext>).then === "function") {
            (nextResult as PromiseLike<TNext>).then(this.fulfillNext, this.rejectNext);
        } else {
            if (this.asnycPrs) {
                this.asnycPrs.tryResolve(nextResult);
            }
            if (Array.isArray(this.next)) {
                for (const i of this.next) {
                    i.$__int__fulfill(nextResult as TNext);
                }
            } else if (typeof this.next === "string") {
                console.error("Settled PromiseLike should not be resolved furthermore.", this.next);
                return;
            }
        }
        this.next = "resolved";
        this.result = nextResult;
    }
    private rejectNext = (nextReason: unknown | PromiseLike<unknown>): void => {
        if (nextReason && typeof nextReason === "object" && typeof (nextReason as PromiseLike<TNext>).then === "function") {
            (nextReason as PromiseLike<TNext>).then(this.fulfillNext, this.rejectNext);
        } else {
            if (this.asnycPrs) {
                this.asnycPrs.tryReject(nextReason);
            }
            if (Array.isArray(this.next)) {
                for (const i of this.next) {
                    i.$__int__reject(nextReason);
                }
            } else if (typeof this.next === "string") {
                console.error("Settled PromisLike should not be rejected furthermore.", this.next);
                return;
            }
        }
        this.next = "rejected";
        this.result = nextReason;
    }
    public then<TResult1 = TNext, TResult2 = never>(
        onfulfilled?: PromiseFulfilledCallback<TNext, TResult1>,
        onrejected?: PromiseRejectedCallback<TResult2>
    ): PromiseLike<TResult1 | TResult2> {
        const next = new SynchronousPromiseLike<TNext, TResult1 | TResult2>(onfulfilled, onrejected);
        if (!this.next) {
            this.next = [];
        }
        if (Array.isArray(this.next)) {
            this.next.push(next);
        } else if (this.next === "resolved") {
            next.$__int__fulfill(this.result as TNext);
        } else if (this.next === "rejected") {
            next.$__int__reject(this.result);
        } else {
            console.error("Invalid state.");
        }
        return next;
    }
    public forceAsync(): PromiseLike<TNext> {
        if (this.asnycPrs) {
            return this.asnycPrs.promise;
        }
        if (this.next === "resolved") {
            return Promise.resolve(this.result as TNext);
        } else if (this.next === "rejected") {
            return Promise.reject(this.result);
        } else {
            console.assert(!this.next || Array.isArray(this.next));
            this.asnycPrs = new PromiseResolutionSource();
            return this.asnycPrs.promise;
        }
    }
}
