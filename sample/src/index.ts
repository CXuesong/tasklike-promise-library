import {
    CancellationTokenSource, delay, ICancellationToken, IRequestParams,
    PromiseCancelledError, requestAnimationFrameAsync, requestIdleCallbackAsync,
    sendRequest, yielded
} from "tasklike-promise-library";
// tslint:disable-next-line:no-duplicate-imports
import * as tplAmbient from "tasklike-promise-library";

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
    $("#tpl-requesticb-run")!.addEventListener("click", () => runDemo(demoRequestIdleCallbackAsync, "#tpl-requesticb-panel", "#tpl-requesticb-cancel"));
    $("#tpl-requestaf-run")!.addEventListener("click", () => runDemo(demoRequestAnimationFrameAsync, "#tpl-requestaf-panel", "#tpl-requestaf-cancel"));
    // Expose TPL library to the debugger console.
    (window as unknown as { TPL: typeof tplAmbient }).TPL = tplAmbient;
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
        console.error(error);
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
    let lastLine = appendLine(panel, "Delay 0ms (SetTimeout(0) + yielded).");
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
                // If ct is cancelled, we won't continue the demo
                throw error;
            }
            panel.appendChild(buildErrorPanel(error));
        } finally {
            appendLine(panel, "----------");
        }
    }
    await sendAndReport({ url: "tsconfig.json?rand=" + Math.random(), method: "GET", timeout: 2000 });
    await sendAndReport({ url: "tsconfig.json", method: "POST" });
}

async function demoRequestIdleCallbackAsync(panel: HTMLElement, ct?: ICancellationToken) {
    ct && ct.throwIfCancellationRequested();
    appendLine(panel, "requestIdleCallbackAsync");
    const status = appendLine(panel, "Requesting…");
    let counter = 0;
    let timeoutCounter = 0;
    let minIdleTime: undefined | number, maxIdleTime: undefined | number;
    while (ct && !ct.isCancellationRequested) {
        const context = await requestIdleCallbackAsync({ timeout: 1000 }, ct);
        // Now we are inside requestIdleCallback callback.
        const timeRemaining = context.deadline.timeRemaining();
        counter++;
        if (context.deadline.didTimeout) { timeoutCounter++; }
        minIdleTime = minIdleTime == null ? timeRemaining : Math.min(timeRemaining, minIdleTime);
        maxIdleTime = maxIdleTime == null ? timeRemaining : Math.max(timeRemaining, maxIdleTime);
        status.innerText = `Requested: ${counter} times, timed-outs: ${timeoutCounter}, minIdleTime: ${minIdleTime}, maxIdleTime: ${maxIdleTime}`;
    }
}

async function demoRequestAnimationFrameAsync(panel: HTMLElement, ct?: ICancellationToken) {
    ct && ct.throwIfCancellationRequested();
    appendLine(panel, "requestAnimationFrameAsync");
    const status = appendLine(panel, "Requesting…");
    const canvas = appendLine(panel, "This is <DIV>.");
    const canvasWidth = 800, canvasHeight = 500;
    const ballSize = 30;
    const ball = document.createElement("button");
    ball.innerText = "ball";
    ball.style.borderRadius = "15px";
    ball.style.position = "absolute";
    ball.style.width = ball.style.height = ballSize + "px";
    canvas.style.position = "relative";
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    canvas.appendChild(ball);
    const startTime = performance.now();
    let prevTime = startTime;
    // Position: pixel.
    let px = 0, py = 0;
    // Velocity: pixel / sec.
    let vx = 200, vy = 200;
    let ax = 0, ay = 150;
    let frameCounter = 0;
    while (ct && !ct.isCancellationRequested) {
        const context = await requestAnimationFrameAsync(ct);
        // Now we are inside requestAnimationFrame callback.
        const frameDuration = context.time - prevTime;
        let x = px + vx * (frameDuration / 1000);
        let y = py + vy * (frameDuration / 1000);
        if (x < 0 || x + ball.offsetWidth > canvasWidth) {
            vx = -vx * (Math.random() * 0.2 + 0.8);
        } else {
            px = x;
            ball.style.left = x + "px";
        }
        if (y < 0 || y + ball.offsetHeight > canvasHeight) {
            vy = -vy * (Math.random() * 0.2 + 0.8);
        } else {
            py = y;
            vy += ay * (frameDuration / 1000);
            ball.style.top = y + "px";
        }
        prevTime = context.time;
        frameCounter++;
        if (frameCounter > 30) {
            status.innerText = `Frames: ${frameCounter}, time: ${((context.time - startTime) / 1000).toFixed(2)} sec., FPS: ${(frameCounter * 1000 / (context.time - startTime)).toFixed(2)}.`;
        }
    }
}

onLoad();
