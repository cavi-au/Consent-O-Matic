import Language from "./Language.js";

/**
 * Consent-O-Manual action notification.
 *
 * A small green notice in the bottom-right corner that tells the user what was
 * answered on their behalf ("Rejected all non-essential cookies on example.com").
 * It is purely visual: it disappears by itself after 5 seconds, can be closed early,
 * and can be turned off in the options page (generalSettings.showNotifications).
 */

const DURATION_MS = 5000;

const MESSAGES = {
    acceptAll: "PLUS_TOAST_ACCEPT",
    rejectAll: "PLUS_TOAST_REJECT",
    subset: "PLUS_TOAST_SUBSET",
    custom: "PLUS_TOAST_CUSTOM",
    hidden: "PLUS_TOAST_HIDDEN"
};

const SOURCES = {
    site: "PLUS_TOAST_SOURCE_SITE",
    global: "PLUS_TOAST_SOURCE_GLOBAL",
    asked: "PLUS_TOAST_SOURCE_ASKED"
};

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.toast {
    position: fixed; right: 16px; bottom: 16px;
    z-index: 2147483647;
    display: flex; align-items: flex-start; gap: 12px;
    max-width: min(380px, calc(100vw - 32px));
    padding: 12px 12px 12px 14px;
    background: #15803d; color: #ffffff;
    border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    animation: in .25s ease-out;
    overflow: hidden;
}
.toast.out { opacity: 0; transform: translateY(8px); transition: opacity .3s, transform .3s; }
.check {
    flex: none; width: 24px; height: 24px; border-radius: 50%;
    background: #ffffff; color: #15803d; font-weight: 700;
    display: flex; align-items: center; justify-content: center; font-size: 15px;
}
.text { flex: 1; min-width: 0; }
.title { font-weight: 700; display: block; overflow-wrap: anywhere; }
.detail { display: block; opacity: .9; font-size: 13px; }
.close {
    flex: none; width: 28px; height: 28px; margin: -4px -4px 0 0;
    border: 0; border-radius: 6px; background: transparent; color: #ffffff;
    font: 18px/1 system-ui, sans-serif; cursor: pointer;
}
.close:hover { background: rgba(255, 255, 255, 0.18); }
.close:focus-visible { outline: 2px solid #ffffff; outline-offset: 1px; }
.timer { position: absolute; left: 0; bottom: 0; height: 3px; background: rgba(255, 255, 255, .6);
    animation: shrink ${DURATION_MS}ms linear forwards; }
@keyframes in { from { opacity: 0; transform: translateY(8px); } }
@keyframes shrink { from { width: 100%; } to { width: 0; } }
@media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
    .toast.out { transition: none; }
}
`;

export default class ActionToast {
    /**
     * @param {object} options
     * @param {string} options.host   Host of the top-level page
     * @param {string} options.mode   "acceptAll" | "rejectAll" | "subset" | "custom" | "hidden"
     * @param {string} options.source "site" | "global" | "asked"
     */
    static show({host, mode, source}) {
        if (MESSAGES[mode] == null) return;
        if (ActionToast.current != null) ActionToast.current.remove();

        host = ("" + host).replace(/:\d+$/, "");

        const hostElement = document.createElement("consent-o-manual-toast");
        hostElement.setAttribute("data-mode", mode);
        const root = hostElement.attachShadow({mode: "closed"});

        const style = document.createElement("style");
        style.textContent = STYLE;

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        const check = document.createElement("span");
        check.className = "check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";

        const text = document.createElement("span");
        text.className = "text";
        const title = document.createElement("span");
        title.className = "title";
        title.textContent = Language.getString(MESSAGES[mode], [null, host]);
        const detail = document.createElement("span");
        detail.className = "detail";
        detail.textContent = Language.getString("PLUS_NAME") +
            (SOURCES[source] != null ? " · " + Language.getString(SOURCES[source]) : "");
        text.append(title, detail);

        const close = document.createElement("button");
        close.type = "button";
        close.className = "close";
        close.setAttribute("aria-label", Language.getString("PLUS_TOAST_CLOSE"));
        close.textContent = "×";

        const timer = document.createElement("span");
        timer.className = "timer";

        toast.append(check, text, close, timer);
        root.append(style, toast);
        (document.body || document.documentElement).appendChild(hostElement);

        let removed = false;
        const remove = ()=>{
            if (removed) return;
            removed = true;
            clearTimeout(timeoutId);
            toast.classList.add("out");
            setTimeout(()=>hostElement.remove(), 300);
            if (ActionToast.current === handle) ActionToast.current = null;
        };
        const timeoutId = setTimeout(remove, DURATION_MS);
        close.addEventListener("click", remove);

        const handle = {remove};
        ActionToast.current = handle;
        return handle;
    }
}

ActionToast.DURATION_MS = DURATION_MS;
ActionToast.current = null;
