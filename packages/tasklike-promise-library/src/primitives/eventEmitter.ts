import { IDisposable } from "./disposable";

interface ICallbackChainItem<T> {
    prev?: ICallbackChainItem<T>;
    callback: (this: any, arg: T) => void;
    thisArg: any;
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
    public addListener<TThis = void>(listener: (this: TThis, arg: T) => void, thisArg?: TThis): IDisposable {
        let item: ICallbackChainItem<T> | undefined = { prev: this.tail, callback: listener, thisArg };
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
        while (current) {
            current.callback.call(current.thisArg, arg);
        }
    }
}
