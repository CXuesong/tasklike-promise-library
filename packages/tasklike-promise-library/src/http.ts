import { ICancellationToken, PromiseCancelledError } from "./cancellation";
import { PromiseResolutionSource } from "./promiseResolutionSource";

export type HttpHeaders = { [name: string]: string };

export interface IRequestParams {
    url: string;
    method: string;
    headers?: HttpHeaders;
    body?: Document | BodyInit | null;
    username?: string | null;
    password?: string | null;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: XMLHttpRequestResponseType;
}

export interface IMutableHttpResponse {
    statusCode: number;
    statusText: string;
    isSuccessfulStatusCode: boolean;
    ensureSuccessfulStatusCode(): void;
}

export type IHttpResponse = Readonly<IMutableHttpResponse>;

export interface IXhrResponse extends IHttpResponse {
    readonly xhr: XMLHttpRequest;
}

export class HttpRequestError extends Error {
    public readonly name: string = "HttpRequestError";
    public constructor(message?: string) {
        super(message == null ? "The HTTP request has failed." : message);
        Object.setPrototypeOf(this, HttpRequestError.prototype);
    }
}

class XhrResponse implements IXhrResponse {
    public readonly statusCode = this.xhr.status;
    public readonly statusText = this.xhr.statusText;
    public readonly isSuccessfulStatusCode = this.xhr.status >= 200 && this.xhr.status <= 299;
    public constructor(public readonly xhr: XMLHttpRequest) {
        console.assert(xhr);
    }
    public ensureSuccessfulStatusCode() {
        if (!this.isSuccessfulStatusCode) {
            throw new HttpRequestError(`The HTTP response code ${this.statusCode} indicates failure.`);
        }
    }
}

export function sendRequest(request: Readonly<IRequestParams>, cancellationToken?: ICancellationToken): Promise<IXhrResponse> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const xhr = new XMLHttpRequest();
    const prs = new PromiseResolutionSource<Readonly<IXhrResponse>>();
    if (request.username != null || request.password != null) {
        xhr.open(request.method, request.url, true, request.username, request.password);
    } else {
        xhr.open(request.method, request.url);
    }
    // In IE the timeout property may only be set after calling open and before calling send.
    if (request.timeout) {
        xhr.timeout = request.timeout;
    }
    if (request.headers) {
        for (const name in request.headers) {
            if (Object.prototype.hasOwnProperty.call(request.headers, name)) {
                xhr.setRequestHeader(name, request.headers[name]);
            }
        }
    }
    if (request.responseType != null) {
        xhr.responseType = request.responseType;
    }
    if (request.withCredentials != null) {
        xhr.withCredentials = request.withCredentials;
    }
    xhr.onload = () => {
        console.assert(xhr.readyState == 4);    // DONE
        prs.tryResolve(new XhrResponse(xhr));
    };
    xhr.onerror = () => {
        prs.tryReject(new HttpRequestError("An error occurred while sending the HTTP request."));
    };
    xhr.ontimeout = () => {
        prs.tryReject(new PromiseCancelledError("HTTP request timeout has reached."));
    };
    // TODO We need unsubscribe this when Promise resolved.
    cancellationToken && cancellationToken.subscribe(() => {
        if (prs.tryCancel()) {
            xhr.abort();
        }
    });
    xhr.send(request.body);
    return prs.promise;
}
