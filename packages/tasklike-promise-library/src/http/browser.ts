/**
 * @internal
 */

/** */
import { IConfigurablePromiseLike, IDisposable, PromiseLikeResolutionSource } from "../primitives";
import { ICancellationToken, PromiseCancelledError } from "../primitives/cancellation";
import { HttpRequestError, IHttpResponse, IRequestParams } from "./common";

/**
 * Represents the response of an XML HTTP request.
 */
export interface IXhrResponse extends IHttpResponse {
    readonly xhr: XMLHttpRequest;
}

export class XhrResponse implements IXhrResponse {
    public readonly statusCode = this.xhr.status;
    public readonly statusText = this.xhr.statusText;
    public readonly isSuccessfulStatusCode = this.xhr.status >= 200 && this.xhr.status <= 299;
    public constructor(public readonly xhr: XMLHttpRequest) {
        console.assert(xhr);
    }
    public getHeaderValue(headerName: string): string | null {
        return this.xhr.getResponseHeader(headerName);
    }
    public getHeaderValues(headerName: string): string[] | null {
        const value = this.xhr.getResponseHeader(headerName);
        if (value == null) return null;
        const result = value.split(",").map(v => v.trimLeft());
        return result;
    }
    public get body(): any {
        return this.xhr.response;
    }
    public ensureSuccessfulStatusCode() {
        if (!this.isSuccessfulStatusCode) {
            throw new HttpRequestError(`The HTTP response code ${this.statusCode} indicates failure.`);
        }
    }
}

export function sendRequest(
    request: Readonly<IRequestParams>,
    cancellationToken?: ICancellationToken
): IConfigurablePromiseLike<IXhrResponse> {
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const xhr = new XMLHttpRequest();
    const plrs = new PromiseLikeResolutionSource<Readonly<IXhrResponse>>();
    let cancellationSubscription: undefined | IDisposable;
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
            if (request.headers.hasOwnProperty(name)) {
                let v = request.headers[name];
                if (v != null) {
                    if (Array.isArray(v)) v = v.join(", ");
                    else v = String(v);
                    xhr.setRequestHeader(name, v);
                }
            }
        }
    }
    if (request.responseType != null) {
        let { responseType } = request;
        // "buffer" is not supported by browsers. For now we simply use the compatible one.
        if (responseType === "buffer") responseType = "arraybuffer";
        xhr.responseType = responseType;
    }
    if (request.withCredentials != null) {
        xhr.withCredentials = request.withCredentials;
    }
    xhr.onload = () => {
        console.assert(xhr.readyState == 4);    // DONE
        cancellationSubscription && cancellationSubscription.dispose();
        plrs.tryResolve(new XhrResponse(xhr));
    };
    xhr.onerror = () => {
        cancellationSubscription && cancellationSubscription.dispose();
        plrs.tryReject(new HttpRequestError("An error occurred while sending the HTTP request."));
    };
    xhr.ontimeout = () => {
        cancellationSubscription && cancellationSubscription.dispose();
        plrs.tryReject(new PromiseCancelledError("HTTP request timeout has reached."));
    };
    cancellationSubscription = cancellationToken && cancellationToken.subscribe(() => {
        if (plrs.tryCancel()) {
            xhr.abort();
        }
    });
    xhr.send(request.body);
    return plrs.promiseLike;
}
