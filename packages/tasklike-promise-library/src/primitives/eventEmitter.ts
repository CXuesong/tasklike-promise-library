import { IDisposable } from "./disposable";

interface ICallbackChainItem<T> {
    prev?: ICallbackChainItem<T>;
    callback: (this: any, arg: T) => void;
    isAsync?: boolean;
    next?: ICallbackChainItem<T>;
}

/**
 * Represents a simple pub-sub event.
 * @typedef T type of the event payload.
 */
export class EventEmitter<T = void> {
    private head: ICallbackChainItem<T> | undefined;
    private tail: ICallbackChainItem<T> | undefined;
    /**
     * Adds an event listener.
     * @param listener function that is called when the current event raises.
     * @param thisArg provides `this` value for the `listener` callback.
     */
    public addListener(listener: (this: undefined, arg: T) => void, isAsync?: boolean, thisArg?: undefined): IDisposable;
    public addListener<TThis>(listener: (this: TThis, arg: T) => void, isAsync: boolean, thisArg: TThis): IDisposable;
    public addListener<TThis>(listener: (this: TThis, arg: T) => void, isAsync: boolean, thisArg: TThis): IDisposable {
        let item: ICallbackChainItem<T> | undefined = { prev: this.tail, callback: listener.bind(thisArg), isAsync };
        if (!this.head) {
            console.assert(!this.tail);
            this.head = item;
        }
        if (this.tail) {
            this.tail.next = item;
        }
        this.tail = item;
        return {
            dispose: () => {
                if (item) {
                    if (item.prev) {
                        console.assert(item.prev.next === item);
                        item.prev.next = item.next;
                    } else {
                        console.assert(this.head === item);
                        this.head = item.next;
                    }
                    if (item.next) {
                        console.assert(item.next.prev === item);
                        item.next.prev = item.prev;
                    } else {
                        console.assert(this.tail === item);
                        this.tail = item.prev;
                    }
                    item = undefined;
                }
            }
        };
    }
    /**
     * Raises the event, calling all the event listeners added to this event instance.
     * @param arg the event payload.
     */
    public raise(arg: T): void {
        let current = this.head;
        const handlers: [ICallbackChainItem<T>["callback"], boolean][] = [];
        let resolvedPromise: undefined | Promise<T>;
        // Pass 1: freeze event handlers to be called.
        while (current) {
            handlers.push([current.callback, !!current.isAsync]);
            current = current.next;
        }
        // Pass 2: call event handlers.
        for (const [handler, isAsync] of handlers) {
            if (isAsync) {
                if (!resolvedPromise) {
                    resolvedPromise = Promise.resolve(arg);
                }
                resolvedPromise.then(handler);
            } else {
                handler(arg);
            }
        }
    }
    /**
     * Clears all the event listeners.
     */
    public clearListeners(): void {
        this.head = this.tail = undefined;
    }
}
