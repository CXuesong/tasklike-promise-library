/**
 * @internal
 */

/** */
import http from "http";

export type HttpOutgoingHeaders = { [name: string]: string | number | string[] | undefined };

export type HttpResponseBodyType = "buffer" | "arraybuffer" | "blob" | "document" | "json" | "text";

/**
 * Represents parameters used to make an `XMLHttpRequest`-based HTTP request.
 * 
 * Documentation for most of the parameters can be found on
 * [MDN's documentation on `XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 */
export interface IRequestParams {
    url: string;
    method: string;
    headers?: HttpOutgoingHeaders;
    body?: Document | BodyInit | null;
    username?: string | null;
    password?: string | null;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: HttpResponseBodyType;
}

/**
 * Represents the basic trait of an HTTP response.
 * Instances directly implementing this interface is mutable.
 * @see IHttpResponse
 */
export interface IMutableHttpResponse {
    statusCode: number;
    statusText: string;
    /**
     * Gets the response header value by name.
     * If there are multiple values with the same header name,
     * they will be joined with a comma and a space (`, `).
     */
    getHeaderValue(headerName: string): string | null;
    /**
     * Gets the response header values by name.
     */
    getHeaderValues(headerName: string): string[] | null;
    body: any;
    isSuccessfulStatusCode: boolean;
    ensureSuccessfulStatusCode(): void;
}

/**
 * Represents the basic trait of an HTTP response.
 * This is the immutable counterpart of `IMutableHttpResponse`.
 */
export type IHttpResponse = Readonly<IMutableHttpResponse>;

// TS does not have browser shim support for now.
// https://github.com/microsoft/TypeScript/issues/7753

/**
 * Represents the response of an XML HTTP request.
 */
export interface IXhrResponse extends IHttpResponse {
    readonly xhr: XMLHttpRequest;
}

/**
 * Represents the response of a NodeJS HTTP request.
 */
export interface INodeHttpResponse extends IHttpResponse {
    readonly message: http.IncomingMessage;
}

/**
 * An error raises when an HTTP request fails due to network transportation
 * or server response.
 */
export class HttpRequestError extends Error {
    public readonly name: string = "HttpRequestError";
    public constructor(message?: string, public readonly inner?: Error) {
        super(message == null ? "The HTTP request has failed." : message);
        Object.setPrototypeOf(this, HttpRequestError.prototype);
    }
}
