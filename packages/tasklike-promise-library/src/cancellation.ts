import { PromiseResolutionSource } from "./promiseResolutionSource";

export class PromiseCancelledError extends Error {
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
    private _cancelled: boolean = false;
    private _cancellationPrs: PromiseResolutionSource;
    public readonly canBeCancelled = true;
    public constructor() {
        this._cancellationPrs = new PromiseResolutionSource();
    }
    public get isCancellationRequested(): boolean {
        return this._cancelled;
    }
    public __int_cancel(): void {
        if (this._cancelled) {
            return;
        }
        this._cancelled = true;
        const result = this._cancellationPrs.tryResolve();
        console.assert(result);
    }
    public throwIfCancellationRequested(): void {
        if (this._cancelled) {
            throw new PromiseCancelledError();
        }
    }
    // TODO return some sort of IDisposable.
    public subscribe(callback: () => void): void {
        this._cancellationPrs.promise.then(callback);
    }
    public get promise(): Promise<void> {
        return this._cancellationPrs.promise;
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
