import * as Tpl from "@cxuesong/tasklike-promise-library";

function $<T extends HTMLElement>(selector: string, scope?: HTMLElement): T | null {
    if (scope) {
        return scope.querySelector(selector) as T;
    }
    return document.querySelector(selector) as T;
}

function onLoad() {
    $("#tpl-delay-run")!.addEventListener("click", async () => {
        const cts = new Tpl.CancellationTokenSource();
        const onCancel = () => { cts.cancel(); };
        const cancelButton = $<HTMLButtonElement>("#tpl-delay-cancel")!;
        cancelButton.addEventListener("click", onCancel);
        cancelButton.disabled = false;
        try {
            await demoDelay(cts.token);
        } finally {
            cancelButton.removeEventListener("click", onCancel);
            cancelButton.disabled = true;
        }
    });
}

async function demoDelay(ct?: Tpl.ICancellationToken) {
    const panel = $("#tpl-delay-panel")!;
    try {
        panel.innerText = "Delay 0ms (Yield).";
        await Tpl.delay(0, ct);
        panel.innerText += " Finished.\n";
        panel.innerText += "Delay 500ms.";
        await Tpl.delay(500, ct);
        panel.innerText += " Finished.\n";
        panel.innerText += "Delay 1s.";
        await Tpl.delay(1000, ct);
        panel.innerText += " Finished.\n";
        panel.innerText += "Delay 2s.";
        await Tpl.delay(2000, ct);
        panel.innerText += " Finished.\n";
        panel.innerText += "Delay 3s.";
        await Tpl.delay(3000, ct);
        panel.innerText += " Finished.\n";
        panel.innerText += "----------";
    } catch (error) {
        panel.innerText += "\n" + (error && error.stack || String(error));
    }
}

onLoad();
