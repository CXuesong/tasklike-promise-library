// Import as few ./src modules as possible.

export class PromiseCancelledError extends Error {
    public readonly name: string = "PromiseCancelledError";
    public constructor(message?: string) {
        super(message == null ? "Promise execution has been cancelled." : message);
        Object.setPrototypeOf(this, PromiseCancelledError.prototype);
    }
}

export interface ICancellationToken {
    readonly isCancellationRequested: boolean;
    readonly promise: Promise<void>;
    throwIfCancellationRequested(): void;
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

export class CancellationTokenSource {
    private _cancellationToken: CancellationToken | undefined;
    public constructor(cancelAfterDelay?: number) {
        if (cancelAfterDelay != null) {
            this.cancelAfter(cancelAfterDelay);
        }
    }
    public get isCancellationRequested(): boolean {
        return !!this._cancellationToken && this._cancellationToken.isCancellationRequested;
    }
    public cancel(): void {
        if (this._cancellationToken) {
            this._cancellationToken.__int_cancel();
        } else {
            this._cancellationToken = cancelledToken;
        }
    }
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
    public get token(): ICancellationToken {
        if (!this._cancellationToken) {
            this._cancellationToken = new CancellationToken();
        }
        return this._cancellationToken;
    }
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
