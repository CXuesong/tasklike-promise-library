import * as Tpl from "@cxuesong/tasklike-promise-library";

function $(selector: string, scope?: HTMLElement): HTMLElement {
    if (scope) {
        return scope.querySelector(selector) as HTMLElement;
    }
    return document.querySelector(selector) as HTMLElement;
}

function onLoad() {
    $("#tpl-delay-run")!.addEventListener("click", demoDelay);
}

async function demoDelay() {
    const panel = $("#tpl-delay-panel")!;
    panel.innerText = "Delay 0ms (Yield).";
    await Tpl.delay(0);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 500ms.";
    await Tpl.delay(500);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 1s.";
    await Tpl.delay(1000);
    panel.innerText += " Finished.\n";
    panel.innerText += "Delay 2s.";
    await Tpl.delay(2000);
    panel.innerText += " Finished.\n";
    panel.innerText += "----------";
}

onLoad();
