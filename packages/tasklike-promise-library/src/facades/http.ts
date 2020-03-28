/**
 * @internal
 */

/** */
import http from "http";
import url from "url";
import { IConfigurablePromiseLike, IDisposable, PromiseLikeResolutionSource } from "../primitives";
import { ICancellationToken, PromiseCancelledError } from "../primitives/cancellation";
import { HttpRequestError, IHttpResponse, IRequestParams } from "./common/http";

/**
 * Represents the response of a NodeJS HTTP request.
 */
export interface INodeHttpResponse extends IHttpResponse {
    readonly message: http.IncomingMessage;
}

class NodeHttpResponse implements INodeHttpResponse {
    public readonly statusCode = this.message.statusCode ?? -1;
    public readonly statusText = this.message.statusMessage || "";
    public readonly isSuccessfulStatusCode = this.message.statusCode != null && this.message.statusCode >= 200 && this.message.statusCode <= 299;
    public constructor(public readonly body: any, public readonly message: http.IncomingMessage) {
        console.assert(message);
    }
    public getHeaderValue(headerName: string): string | null {
        const value = this.message.headers[headerName];
        if (value == null) return null;
        if (Array.isArray(value)) return value.join(", ");
        return value;
    }
    public getHeaderValues(headerName: string): string[] | null {
        const value = this.message.headers[headerName];
        if (value == null) return null;
        if (Array.isArray(value)) return value;
        return value.split(", ");
    }
    public ensureSuccessfulStatusCode() {
        if (!this.isSuccessfulStatusCode) {
            throw new HttpRequestError(`The HTTP response code ${this.statusCode} indicates failure.`);
        }
    }
}

// TODO: This part needs further testing.
export function sendRequest(
    request: Readonly<IRequestParams>,
    cancellationToken?: ICancellationToken
): IConfigurablePromiseLike<INodeHttpResponse> {
    if (request.responseType === "document") throw new RangeError("responseType = document is not supported in NodeJS.");
    if (request.responseType === "blob") throw new RangeError("responseType = blob is not supported in NodeJS.");
    cancellationToken && cancellationToken.throwIfCancellationRequested();
    const requestUrl = new url.URL(request.url);
    const auth = request.username != null || request.password != null
        ? ((request.username || "") + ":" + (request.password || ""))
        : requestUrl.username || requestUrl.password
            ? (requestUrl.username + ":" + requestUrl.password) : undefined;
    const options: http.RequestOptions = {
        auth,
        headers: request.headers,
        host: requestUrl.host,
        method: request.method,
        path: requestUrl.pathname + requestUrl.search + requestUrl.hash,
        protocol: requestUrl.protocol,
        timeout: request.timeout
    };
    const plrs = new PromiseLikeResolutionSource<Readonly<INodeHttpResponse>>();
    const clientRequest = http.request(options);
    const cancellationSubscription = cancellationToken && cancellationToken.subscribe(() => {
        if (plrs.tryCancel()) {
            clientRequest.abort();
        }
    });
    clientRequest.on("response", resp => {
        const buffers: string[] | Buffer[] = [];
        resp.on("data", chunk => {
            if (typeof chunk === "string" || chunk instanceof Buffer) {
                buffers.push(chunk as any);
            } else {
                resp.destroy(new TypeError(`Unexpected response chunk type: ${Object.getPrototypeOf(chunk)}.`));
            }
        });
        resp.on("end", () => {
            let body: string | ArrayBuffer | undefined = undefined;
            if (buffers.length > 0) {
                if (typeof buffers[0] === "string") {
                    body = buffers.join("");
                } else if (buffers[0] instanceof Uint8Array) {
                    const contentLength = (buffers as Uint8Array[]).reduce((p, b) => p + b.length, 0);
                    body = new ArrayBuffer(contentLength);
                    const buffer = new Buffer(body);
                    let pos = 0;
                    for (const b of buffers as Buffer[]) {
                        b.copy(buffer, pos, 0);
                    }
                }
                switch (request.responseType) {
                    case "text":
                        if (body instanceof Buffer) {
                            body = body.toString();
                        }
                        break;
                    case "json":
                        if (typeof body === "string") {
                            body = JSON.parse(body);
                        }
                        break;
                    case "buffer":
                        if (typeof body === "string") {
                            body = new Buffer(body);
                        }
                        break;
                    case "arraybuffer":
                        throw new Error("Not supported");
                }
                cancellationSubscription && cancellationSubscription.dispose();
                plrs.tryResolve(new NodeHttpResponse(body, resp));
            }
        });
        resp.on("error", err => {
            cancellationSubscription && cancellationSubscription.dispose();
            plrs.tryReject(new HttpRequestError("An error occurred while receiving the HTTP response.", err));
        });
    });
    clientRequest.on("error", err => {
        cancellationSubscription && cancellationSubscription.dispose();
        plrs.tryReject(new HttpRequestError("An error occurred while sending the HTTP request.", err));
    });
    clientRequest.on("timeout", () => {
        cancellationSubscription && cancellationSubscription.dispose();
        plrs.tryReject(new PromiseCancelledError("HTTP request timeout has reached."));
    });
    return plrs.promiseLike;
}
