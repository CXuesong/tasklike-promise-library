// Import as few ./src modules as possible.
/**
 * This module contains the infrastructure for cooperative `Promise` cancellation.
 * 
 * @see {@link ICancellationToken}
 */

/**
 * An error that raises when the current promise has been rejected due to cancellation.
 * 
 * @remarks
 * ES6 `Promise` does not have cancellation support,
 * so TPL uses `reject` with {@link PromiseCancelledError} to indicate a cancelled `Promise`.
 */
export class PromiseCancelledError extends Error {
    public readonly name: string = "PromiseCancelledError";
    public constructor(message?: string) {
        super(message == null ? "Promise execution has been cancelled." : message);
        Object.setPrototypeOf(this, PromiseCancelledError.prototype);
    }
}

/**
 * Represents subscribable a cancellation notification.
 * 
 * Cancellation notification can be propagated by passing the same instance into cancellable callee async functions.
 * 
 * @remarks
 * Like the concept of "Task cooperative cancellation" introduced in .NET Framework,
 * when the async function implementation wants to support cancellation, it should accept an
 * extra optional parameter of type {@link ICancellationToken}.
 * 
 * In your function implementation, you should do at least one of the following
 * 
 * * Check for cancellation with {@link ICancellationToken.isCancellationRequested} or {@link ICancellationToken.throwIfCancellationRequested};
 * * Pass the cancellation token into the callee functions that supports cancellation with {@link ICancellationToken};
 * * Subscribe for the cancellation event with {@link ICancellationToken.subscribe}.
 * 
 * ```ts
 * async function doSomeWork(ct?: ICancellationToken) {
    *   ct.throwIfCancellationRequested();
    *   // do something
    *   await delay(1000, ct);
    *   // do something else
    * }
    * ```
 * @see {@link CancellationTokenSource}
 */
export interface ICancellationToken {
    /**
     * Whether the token owner has requested for cancellation.
     * 
     * @remarks
     * Note that if this field returns `true`,
     * the `subscribe` callbacks are not guaranteed to have (all) executed.
     * 
     * @see {@link ICancellationToken.throwIfCancellationRequested}
    */
    readonly isCancellationRequested: boolean;
    /**
     * Gets a `Promise` that resolves when the token owner has requested for cancellation.
     */
    readonly promise: Promise<void>;
    /**
     * Throws a `PromiseCancelledError` if `isCancellationRequested` is `true`.
     * 
     * @see {@link ICancellationToken.isCancellationRequested}
     */
    throwIfCancellationRequested(): void;
    /**
     * Adds a callback function that is called when token owner has requested for cancellation.
     * 
     * @remarks
     * if the cancellation token has already been cancelled when calling this function,
     * the callback is still guaranteed to be executed asynchronously.
     * 
     * @todo
     * In future version, this function should return a token for caller to cancel the subscription.
     */
    subscribe(callback: () => void): void;
}

class CancellationToken implements ICancellationToken {
    // Do not depend on promiseResolutionSource here. Actually it may depend on CancellationToken in the future.
    private _notifyCancel: (() => void) | undefined;
    private _cancellationPromise: Promise<void> | undefined;
    public get isCancellationRequested(): boolean {
        return !!this._cancellationPromise && !this._notifyCancel;
    }
    private _ensurePromiseInitialized() {
        if (!this._cancellationPromise) {
            this._cancellationPromise = new Promise((res, rej) => { this._notifyCancel = res; });
        }
    }
    public __int_cancel(): void {
        this._ensurePromiseInitialized();
        if (this._notifyCancel) {
            this._notifyCancel();
            this._notifyCancel = undefined;
        }
    }
    public throwIfCancellationRequested(): void {
        if (this._cancellationPromise && !this._notifyCancel) {
            throw new PromiseCancelledError();
        }
    }
    // TODO return some sort of IDisposable.
    public subscribe(callback: () => void): void {
        this._ensurePromiseInitialized();
        this._cancellationPromise!.then(callback);
    }
    public get promise(): Promise<void> {
        this._ensurePromiseInitialized();
        return this._cancellationPromise!;
    }
}

const cancelledToken = new CancellationToken();
cancelledToken.__int_cancel();

/**
 * Represents an owner of {@link ICancellationToken} that can initiates the cancellation.
 */
export class CancellationTokenSource {
    private _cancellationToken: CancellationToken | undefined;
    /**
     * @param cancelAfterDelay Automatically requests cancellation after the specified non-negative time in milliseconds.
     */
    public constructor(cancelAfterDelay?: number) {
        if (cancelAfterDelay != null) {
            this.cancelAfter(cancelAfterDelay);
        }
    }
    /** Whether the cancellation has been requested. */
    public get isCancellationRequested(): boolean {
        return !!this._cancellationToken && this._cancellationToken.isCancellationRequested;
    }
    /**
     * Initiates cancellation if it has not been requested yet.
     * Notifies the derived `ICancellationToken` of the cancellation.
     */
    public cancel(): void {
        if (this._cancellationToken) {
            this._cancellationToken.__int_cancel();
        } else {
            this._cancellationToken = cancelledToken;
        }
    }
    /**
     * Initiates cancellation after the specified delay.
     * @param delay the non-negative time in milliseconds to wait before initiating the cancellation.
     */
    public cancelAfter(delay: number): void {
        if (delay < 0) {
            throw new RangeError("delay (arg#1) should be a non-negative number.");
        }
        if (delay === 0) {
            this.cancel();
        } else {
            setTimeout(() => { this.cancel(); }, delay);
        }
    }
    /** Gets the derived `ICancellationToken` from this token source. */
    public get token(): ICancellationToken {
        if (!this._cancellationToken) {
            this._cancellationToken = new CancellationToken();
        }
        return this._cancellationToken;
    }
    /**
     * Gets a `CancellationTokenSource` that gets cancelled when any of the specified `ICancellationToken` gets cancelled.
     * @param cancellationTokens One or more underlying `ICancellationToken`.
     */
    public static race(...cancellationTokens: Array<ICancellationToken | null | undefined>): CancellationTokenSource {
        const cts = new CancellationTokenSource();
        const cancellationCallback = () => { cts.cancel(); };
        for (const token of cancellationTokens) {
            if (token) {
                token.subscribe(cancellationCallback);
            }
        }
        return cts;
    }
}
