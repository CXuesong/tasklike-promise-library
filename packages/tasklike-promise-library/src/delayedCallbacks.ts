/**
 * @module
 * Contains adapter functions that allows you to switch into another context when you subscribe the returned `PromiseLike`s.
 * For example, in async functions, if you want to execute part of your logic inside an
 * [animation frame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame),
 * you may now use
 * ```ts
 * async function playAnimation(cancellationToken?: ICancellationToken): Promise<void> {
 *     cancellationToken && cancellationToken.throwIfCancellationRequested();
 *     while (true) {
 *         const animationFrame = await requestAnimationFrameAsync(cancellationToken);
 *         // TBC.
 *     }
 * }
 * ```
 */
/** */
import { IConfigurablePromiseLike, IDisposable, PromiseLikeResolutionSource } from "./primitives";
import { ICancellationToken } from "./primitives/cancellation";

/**
 * Gets a `PromiseLike` that resolves inside `window.setTimeout` callback.
 * @param milliseconds the delay in milliseconds before the `PromiseLike` resolves.
 * @param cancellationToken a token used to cancel the timeout with `window.clearTimeout`.
 * @returns a `PromiseLike` that resolves inside `window.setTimeout` callback.
 * Resolved value is the timeout ID returned from `window.setTimeout`.
 * @remarks Compared with {@link delay}, this function is more low-level and you should prefer to
 * use {@link delay} when possible.
 */
export function setTimeoutAsync(milliseconds: number, cancellationToken?: ICancellationToken): IConfigurablePromiseLike<number> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const plrs = new PromiseLikeResolutionSource<number>();
    let subscription: undefined | IDisposable;
    const id = window.setTimeout(() => {
        subscription && subscription.dispose();
        plrs.tryResolve(id);
    }, milliseconds);
    if (cancellationToken) {
        subscription = cancellationToken.subscribe(() => {
            window.clearTimeout(id);
            plrs.tryCancel();
        });
    }
    return plrs.promiseLike;
}

/**
 * Provides context for {@link requestAnimationFrameAsync}.
 */
export interface IRequestAnimationFrameContext {
    /** RAF ID. */
    id: number;
    /** Time when the RAF triggered. */
    time: number;
}

/**
 * Gets a `PromiseLike` that resolves inside `window.requestAnimationFrame` callback.
 * @param cancellationToken a token used to cancel the timeout with `window.cancelAnimationFrame`.
 * @returns a `PromiseLike` that resolves inside `window.requestAnimationFrame` callback.
 * Resolved value contains RAF context.
 */
export function requestAnimationFrameAsync(cancellationToken?: ICancellationToken): IConfigurablePromiseLike<Readonly<IRequestAnimationFrameContext>> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const plrs = new PromiseLikeResolutionSource<IRequestAnimationFrameContext>();
    let subscription: undefined | IDisposable;
    const id = window.requestAnimationFrame((time) => {
        subscription && subscription.dispose();
        plrs.tryResolve({ id, time });
    });
    if (cancellationToken) {
        subscription = cancellationToken.subscribe(() => {
            window.cancelAnimationFrame(id);
            plrs.tryCancel();
        });
    }
    return plrs.promiseLike;
}

/**
 * Options for `window.requestIdleCallback`.
 * See [`window.requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#Parameters) for more information.
 */
export interface IRequestIdleCallbackOptions {
    timeout?: number;
}

/**
 * Callback argument for `window.requestIdleCallback`.
 * See [`IdleDeadline`](https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline) for more information.
 */
export interface IRequestIdleCallbackDeadline {
    didTimeout: boolean;
    timeRemaining(): number;
}

/**
 * Provides context for {@link requestAnimationFrameAsync}.
 */
export interface IRequestIdleCallbackContext {
    /** RequestIdleCallback ID. */
    id: number;
    /** Deadline information. */
    deadline: IRequestIdleCallbackDeadline;
}

interface IWindowExp {
    requestIdleCallback(callback: (deadline: IRequestIdleCallbackDeadline) => void, options?: IRequestIdleCallbackOptions): number;
    cancelIdleCallback(handle: number): void;
}

/**
 * @experimental
 * Gets a `PromiseLike` that resolves inside `window.requestIdleCallback` callback.
 * @param options options passed into `requestIdleCallback` function.
 * @param cancellationToken a token used to cancel the timeout with `window.cancelIdleCallback`.
 * @returns a `PromiseLike` that resolves inside `window.requestIdleCallback` callback.
 * Resolved value contains requestIdleCallback context.
 */
export function requestIdleCallbackAsync(
    options?: IRequestIdleCallbackOptions,
    cancellationToken?: ICancellationToken
): IConfigurablePromiseLike<Readonly<IRequestIdleCallbackContext>> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const plrs = new PromiseLikeResolutionSource<IRequestIdleCallbackContext>();
    let subscription: undefined | IDisposable;
    const id = (window as unknown as IWindowExp).requestIdleCallback((deadline) => {
        subscription && subscription.dispose();
        plrs.tryResolve({ id, deadline });
    }, options);
    if (cancellationToken) {
        subscription = cancellationToken.subscribe(() => {
            (window as unknown as IWindowExp).cancelIdleCallback(id);
            plrs.tryCancel();
        });
    }
    return plrs.promiseLike;
}
