import { CancellationTokenSource, delay, ICancellationToken, IRequestParams, sendRequest } from "@cxuesong/tasklike-promise-library";

function $<T extends HTMLElement>(selector: string, scope?: HTMLElement): T | null {
    if (scope) {
        return scope.querySelector(selector) as T;
    }
    return document.querySelector(selector) as T;
}

function onLoad() {
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
    demoFunc: (panel: HTMLElement, cancellationToken: ICancellationToken) => void | Promise<void>,
    panelSelector: string,
    cancellationButtonSelector: string) {
    const cts = new CancellationTokenSource();
    const onCancel = () => { cts.cancel(); };
    const panel = $(panelSelector)!;
    const cancelButton = $<HTMLButtonElement>(cancellationButtonSelector)!;
    cancelButton.addEventListener("click", onCancel);
    cancelButton.disabled = false;
    panel.innerText = "";
    try {
        const result = demoFunc(panel, cts.token);
        if (result) {
            await result;
        }
    }
    catch (error) {
        panel.appendChild(buildErrorPanel(error));
    } finally {
        cancelButton.removeEventListener("click", onCancel);
        cancelButton.disabled = true;
    }
}

async function demoDelay(panel: HTMLElement, ct: ICancellationToken) {
    panel.innerText = "Delay 0ms (Yield).";
    await delay(0, ct);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 500ms.";
    await delay(500, ct);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 1s.";
    await delay(1000, ct);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 2s.";
    await delay(2000, ct);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 3s.";
    await delay(3000, ct);
    panel.innerText += " Finished.\n";
    panel.innerText += "----------";
}

async function demoHttp(panel: HTMLElement, ct: ICancellationToken) {
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
            panel.appendChild(buildErrorPanel(error));
        } finally {
            appendLine(panel, "----------");
        }
    }
    await sendAndReport({ url: "/tsconfig.json", method: "GET" });
    await sendAndReport({ url: "/tsconfig.json", method: "POST" });
}

onLoad();
