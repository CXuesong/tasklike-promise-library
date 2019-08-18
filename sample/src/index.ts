import {
    CancellationTokenSource, delay, ICancellationToken, IRequestParams,
    PromiseCancelledError, sendRequest, yielded
} from "@cxuesong/tasklike-promise-library";

function $<T extends HTMLElement>(selector: string, scope?: HTMLElement): T | null {
    if (scope) {
        return scope.querySelector(selector) as T;
    }
    return document.querySelector(selector) as T;
}

function onLoad() {
    $("#tpl-yielded-run")!.addEventListener("click", () => runDemo(demoYield, "#tpl-yielded-panel"));
    $("#tpl-delay-run")!.addEventListener("click", () => runDemo(demoDelay, "#tpl-delay-panel", "#tpl-delay-cancel"));
    $("#tpl-sendrequest-run")!.addEventListener("click", () => runDemo(demoHttp, "#tpl-sendrequest-panel", "#tpl-sendrequest-cancel"));
}

function buildErrorPanel(error: unknown) {
    const errBox = document.createElement("div");
    errBox.classList.add("error");
    errBox.innerText = error && (error as { stack?: string }).stack || String(error);
    return errBox;
}

function appendLine(container: HTMLElement, content: string): HTMLElement {
    const line = document.createElement("div");
    line.innerText = content;
    container.appendChild(line);
    return line;
}

async function runDemo(
    demoFunc: (panel: HTMLElement, cancellationToken?: ICancellationToken) => void | Promise<void>,
    panelSelector: string,
    cancellationButtonSelector?: string) {
    const cts = new CancellationTokenSource();
    const onCancel = () => { cts.cancel(); };
    const panel = $(panelSelector)!;
    const cancelButton = cancellationButtonSelector ? $<HTMLButtonElement>(cancellationButtonSelector) : null;
    if (cancelButton) {
        cancelButton.addEventListener("click", onCancel);
        cancelButton.disabled = false;
    }
    panel.innerText = "";
    try {
        const result = demoFunc(panel, cancelButton ? cts.token : undefined);
        if (result) {
            await result;
        }
    }
    catch (error) {
        panel.appendChild(buildErrorPanel(error));
    } finally {
        if (cancelButton) {
            cancelButton.removeEventListener("click", onCancel);
            cancelButton.disabled = true;
        }
    }
}

function demoYield(panel: HTMLElement) {
    async function myAsyncFunction() {
        appendLine(panel, "Callee: Do some work synchronously in myAsyncFunction…");
        appendLine(panel, "Callee: myAsyncFunction is to yield…");
        await yielded();
        appendLine(panel, "Callee: back from yielded state…");
        appendLine(panel, "Callee: exiting.");
    }
    appendLine(panel, "Caller: Call myAsyncFunction.");
    myAsyncFunction();
    appendLine(panel, "Caller: We decide don't await for myAsyncFunction.");
    appendLine(panel, "Caller: exiting.");
}

async function demoDelay(panel: HTMLElement, ct?: ICancellationToken) {
    let lastLine = appendLine(panel, "Delay 0ms (Yield).");
    await delay(0, ct);
    lastLine.innerText += " Finished.";
    lastLine = appendLine(panel, "Delay 500ms.");
    await delay(500, ct);
    lastLine.innerText += " Finished.";
    lastLine = appendLine(panel, "Delay 1s.");
    await delay(1000, ct);
    lastLine.innerText += " Finished.";
    lastLine = appendLine(panel, "Delay 2s.");
    await delay(2000, ct);
    lastLine.innerText += " Finished.";
    lastLine = appendLine(panel, "Delay 3s.");
    await delay(3000, ct);
    lastLine.innerText += " Finished.";
    appendLine(panel, "----------");
}

async function demoHttp(panel: HTMLElement, ct?: ICancellationToken) {
    async function sendAndReport(request: IRequestParams) {
        let lastLine = appendLine(panel, `${request.method} request to ${request.url}…`);
        try {
            const response = await sendRequest(request, ct);
            lastLine.innerText += " " + response.statusCode + " " + response.statusText;
            appendLine(panel, "Content-Type: " + response.xhr.getResponseHeader("Content-Type"));
            const bodyContainer = document.createElement("pre");
            bodyContainer.classList.add("http-response-body");
            bodyContainer.innerText = response.xhr.responseText;
            panel.appendChild(bodyContainer);
            lastLine = appendLine(panel, "ensureSuccessfulStatusCode…");
            response.ensureSuccessfulStatusCode();
            lastLine.innerText += " Successful.";
        } catch (error) {
            if (error instanceof PromiseCancelledError) {
                console.assert(ct && ct.isCancellationRequested);
                // If ct is cancelled, we won't continue the demo
                throw error;
            }
            panel.appendChild(buildErrorPanel(error));
        } finally {
            appendLine(panel, "----------");
        }
    }
    await sendAndReport({ url: "/tsconfig.json", method: "GET", timeout: 2000 });
    await sendAndReport({ url: "/tsconfig.json", method: "POST" });
}

onLoad();
