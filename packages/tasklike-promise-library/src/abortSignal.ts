/**
 * @module
 * This module contains interoperability with DOM `AbortSignal` and `AbortSignal`-like objects.
 */
/** */
import { CancellationTokenSource, ICancellationToken, IDisposable } from "./primitives";

type OnAbortEventListener = (this: AbortSignal, ev: Event) => any;

class CancellationTokenAbortSignalAdapter implements AbortSignal {
    private _onAbortListeners: EventListenerOrEventListenerObject[] = [];
    private _ctSubscription: IDisposable | undefined;
    private _onCtCancelled = () => {
        const event = new Event("abort");
        this.dispatchEvent(event);
    }
    private _updateCtSubscription(): void {
        if (this._onAbort || this._onAbortListeners.length > 0) {
            if (!this._ctSubscription) {
                this._cancellationToken.subscribe(this._onCtCancelled);
            }
        } else {
            if (this._ctSubscription) {
                this._ctSubscription.dispose();
                this._ctSubscription = undefined;
            }
        }
    }
    public constructor(private readonly _cancellationToken: ICancellationToken) {
    }
    public get aborted(): boolean {
        return this._cancellationToken.isCancellationRequested;
    }
    private _onAbort: OnAbortEventListener | null = null;
    public get onabort(): OnAbortEventListener | null {
        return this._onAbort;
    }
    public set onabort(value: OnAbortEventListener | null) {
        this._onAbort = value;
        this._updateCtSubscription();
    }
    public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type === "abort") {
            this._onAbortListeners.push(listener);
            this._updateCtSubscription();
        }
    }
    public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type === "abort") {
            const index = this._onAbortListeners.indexOf(listener);
            if (index >= 0) this._onAbortListeners.splice(index, 1);
        }
    }
    public dispatchEvent(event: Event): boolean {
        if (event.type === "abort") {
            for (const listener of this._onAbortListeners) {
                if (typeof listener === "function") {
                    listener(event);
                } else {
                    listener.handleEvent(event);
                }
            }
            if (this._onAbort) {
                this._onAbort(event);
            }
            return true;
        }
        throw new RangeError("event.type only supports \"abort\".");
    }
}

let abortSignalCache: WeakMap<ICancellationToken, AbortSignal> | undefined;

/**
 * Gets an `AbortSignal` from {@link ICancellationToken}.
 * @param cancellationToken the source cancellation token.
 * @returns a DOM `AbortSignal` instance,
 *  or an `AbortSignal`-like adapter provided by TPL if there is no native `AbortSignal`
 *  and `AbortController` available in the global environment.
 */
export function abortSignalFromCancellationToken(cancellationToken: ICancellationToken): AbortSignal {
    if (abortSignalCache) {
        const s = abortSignalCache.get(cancellationToken);
        if (s) return s;
    } else if (typeof WeakMap === "function") {
        abortSignalCache = new WeakMap();
    }
    let s: AbortSignal | undefined;
    if (typeof AbortController === "function") {
        const ac = new AbortController();
        if (cancellationToken.isCancellationRequested) {
            ac.abort();
        } else {
            cancellationToken.subscribe(() => ac.abort());
        }
        s = ac.signal;
    } else {
        s = new CancellationTokenAbortSignalAdapter(cancellationToken);
    }
    if (abortSignalCache) abortSignalCache.set(cancellationToken, s);
    return s;
}

/**
 * Represents an `AbortSignal`-like object with basic abort state and subscribable abort event.
 */
export type AdaptableAbortSignalLike = Pick<AbortSignal, "aborted" | "addEventListener">;

let cancellationTokenCache: WeakMap<AdaptableAbortSignalLike, CancellationTokenSource> | undefined;

/**
 * Gets an {@link ICancellationToken} from the specified `AbortSignal`.
 * @param abortSignal an abort signal that will cancel the returned {@link ICancellationToken} upon `abort` event.
 */
export function cancellationTokenFromAbortSignal(abortSignal: AdaptableAbortSignalLike): ICancellationToken {
    if (cancellationTokenCache) {
        const c = cancellationTokenCache.get(abortSignal);
        if (c) return c.token;
    } else if (typeof WeakMap === "function") {
        cancellationTokenCache = new WeakMap();
    }
    const c = new CancellationTokenSource();
    if (abortSignal.aborted) {
        c.cancel();
    } else {
        abortSignal.addEventListener("abort", () => c.cancel());
    }
    if (cancellationTokenCache) cancellationTokenCache.set(abortSignal, c);
    return c.token;
}
