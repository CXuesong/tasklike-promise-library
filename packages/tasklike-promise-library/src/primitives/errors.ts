/**
 * Represents an Error with optional inner error.
 */
export interface INestableError {
    readonly inner?: any;
    getBaseError(): any;
}

class RawValueError extends Error implements INestableError {
    public readonly name = "RawValueError";
    constructor(public readonly rawValue: any, public readonly inner?: any) {
        super();
        Object.setPrototypeOf(this, RawValueError);
    }
    public readonly getBaseError = getBaseError;
}

function getBaseError(this: INestableError) {
    let current = this;
    while (current.inner != null) {
        current = current.inner;
    }
    return current;
}

export function setInnerError(error: any, inner: any): Error & INestableError {
    if (error instanceof Error) {
        Object.defineProperty(error, "inner", { value: inner, writable: false });
        Object.defineProperty(error, "getBaseError", { value: getBaseError, writable: false });
        return error as (Error & INestableError);
    } else {
        return new RawValueError(error, inner);
    }
}

export class AggregateError extends Error {
    public readonly name = "RawValueError";
    public readonly innerErrors: readonly any[];
    constructor(message?: string, ...errors: any[]) {
        super();
        Object.setPrototypeOf(this, AggregateError);
        this.innerErrors = errors.filter(e => e != null);
    }
    public forEach<TThis>(callback: (this: TThis, error: any) => void, thisArg: TThis): void;
    public forEach(callback: (this: void, error: any) => void): void;
    public forEach(callback: (this: unknown, error: any) => void, thisArg?: unknown): void {
        callback.call(thisArg, this);
        for (const e of this.innerErrors) {
            callback.call(thisArg, e);
            if (e instanceof AggregateError) {
                e.forEach(callback, thisArg);
            }
        }
    }
}
