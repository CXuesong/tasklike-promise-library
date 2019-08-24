import { PromiseCancelledError } from "./cancellation";

export class PromiseLikeResolutionSource<T = void> {
    private _promiseLike: undefined | SynchronousPromiseLike<never, T>;
    private _ensurePromiseLikeInitialized(): void {
        if (!this._promiseLike) {
            this._promiseLike = new SynchronousPromiseLike();
        }
    }
    public get PromiseLike(): PromiseLike<T> {
        this._ensurePromiseLikeInitialized();
        return this._promiseLike!;
    }
    public tryResolve(result: T | PromiseLike<T>): boolean {
        this._ensurePromiseLikeInitialized();
        if (this._promiseLike!.$__int__settled) {
            return false;
        }
        this._promiseLike!.$__int__fulfill(result);
        return true;
    }
    public tryCancel(): boolean {
        this._ensurePromiseLikeInitialized();
        if (this._promiseLike!.$__int__settled) {
            return false;
        }
        this._promiseLike!.$__int__reject(new PromiseCancelledError());
        return true;
    }
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

class SynchronousPromiseLike<TPrev, TNext> implements PromiseLike<TNext> {
    private next: undefined | SynchronousPromiseLike<TNext, any>[] | "resolving" | "resolved" | "rejecting" | "rejected";
    private result: unknown;
    public constructor(private _onfulfilled?: PromiseFulfilledCallback<TPrev, TNext>, private _onrejected?: PromiseRejectedCallback<TNext>) {

    }
    public get $__int__settled(): boolean {
        return typeof this.next === "string";
    }
    // Note: TNext | PromiseLike<TNext> is only used when TPrev == TNext
    public $__int__fulfill(prevResult: TPrev | TNext | PromiseLike<TNext>) {
        if (Array.isArray(this.next)) {
            try {
                if (this._onfulfilled) {
                    const result = this._onfulfilled(prevResult as TPrev);
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
    }
    public $__int__reject(reason: unknown) {
        if (Array.isArray(this.next)) {
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
    }
    private fulfillNext = (nextResult: TNext | PromiseLike<TPrev | TNext>): void => {
        if (nextResult && typeof nextResult === "object" && typeof (nextResult as PromiseLike<TNext>).then === "function") {
            (nextResult as PromiseLike<TNext>).then(this.fulfillNext, this.rejectNext);
        } else {
            if (Array.isArray(this.next)) {
                for (const i of this.next) {
                    i.$__int__fulfill(nextResult as TNext);
                }
            } else if (typeof this.next === "string") {
                console.warn("Settled PromiseLike should not be resolved furthermore.", this.next);
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
            if (Array.isArray(this.next)) {
                for (const i of this.next) {
                    i.$__int__reject(nextReason);
                }
            } else if (typeof this.next === "string") {
                console.warn("Settled PromisLike should not be rejected furthermore.", this.next);
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
}
