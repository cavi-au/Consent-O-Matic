import Language from "./Language.js";

/**
 * Consent-O-Matic Plus unified consent popup.
 *
 * Shown in the top frame when a CMP is detected and the resolved mode is "ask".
 * It replaces every site's own banner with one consistent, accessible dialog:
 *
 *   - Accept all
 *   - Reject all non-essential
 *   - Use my preferences   (the "my subset" categories chosen in the options page)
 *   - Customize            (pick categories for this site only)
 *
 * The dialog lives in a closed shadow root so the page can neither restyle it nor
 * script it, and only trusted (real user) events are accepted.
 *
 * UnifiedPopup.show() resolves with
 *   {mode: "acceptAll"|"rejectAll"|"subset"|"custom", values: {A..X} (custom only), remember: bool}
 * or null if the user chose "Not now" (the site's own banner is then left alone).
 */

// Category keys in display order, with their translation keys
const CATEGORIES = [
    {type: "A", name: "PREFERENCES_NAME", description: "PLUS_SHORT_A"},
    {type: "B", name: "PERFORMANCE_NAME", description: "PLUS_SHORT_B"},
    {type: "D", name: "INFORMATION_NAME", description: "PLUS_SHORT_D"},
    {type: "E", name: "CONTENT_NAME", description: "PLUS_SHORT_E"},
    {type: "F", name: "AD_NAME", description: "PLUS_SHORT_F"},
    {type: "X", name: "OTHER_NAME", description: "PLUS_SHORT_X"}
];

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.backdrop {
    position: fixed; inset: 0;
    z-index: 2147483647;
    display: flex; align-items: flex-end; justify-content: center;
    padding: 16px;
    background: rgba(10, 14, 30, 0.45);
    font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --bg: #ffffff; --fg: #141a33; --muted: #4a5170; --line: #d5d9e8;
    --primary: #25348c; --primary-hover: #3244a2; --primary-fg: #ffffff;
    --soft: #eef0f8; --soft-hover: #e2e6f5; --focus: #f5a623;
    color: var(--fg);
}
@media (prefers-color-scheme: dark) {
    .backdrop {
        --bg: #1b1f2e; --fg: #eef0f8; --muted: #b3b9d1; --line: #343a52;
        --primary: #6d7ff0; --primary-hover: #8191f5; --primary-fg: #0d1022;
        --soft: #262b3f; --soft-hover: #30364d;
    }
}
@media (min-width: 640px) { .backdrop { align-items: center; } }
.dialog {
    width: 100%; max-width: 520px; max-height: calc(100vh - 32px); overflow: auto;
    background: var(--bg); color: var(--fg);
    border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    padding: 22px 22px 16px;
}
.brand { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px;
    font-weight: 600; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; }
h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.25; }
p { margin: 0 0 14px; color: var(--muted); }
.host { color: var(--fg); font-weight: 600; word-break: break-all; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
@media (max-width: 380px) { .row { grid-template-columns: 1fr; } }
button {
    font: inherit; cursor: pointer; border-radius: 10px; min-height: 44px;
    padding: 10px 14px; border: 1px solid var(--line);
    background: var(--soft); color: var(--fg); text-align: center;
}
button:hover { background: var(--soft-hover); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button.primary { background: var(--primary); border-color: var(--primary); color: var(--primary-fg); font-weight: 600; }
button.primary:hover { background: var(--primary-hover); }
button.wide { width: 100%; display: block; margin-bottom: 10px; text-align: left; }
button.wide .sub { display: block; font-size: 13px; opacity: .85; font-weight: 400; margin-top: 2px; }
.categories { display: none; border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; margin-bottom: 10px; }
.categories.open { display: block; }
.cat { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--line); }
.cat:last-of-type { border-bottom: 0; }
.cat input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; accent-color: var(--primary); }
.cat label { cursor: pointer; }
.cat .name { font-weight: 600; display: block; }
.cat .desc { font-size: 13px; color: var(--muted); display: block; }
.remember { display: flex; gap: 8px; align-items: center; margin: 4px 0 12px; color: var(--muted); font-size: 14px; }
.remember input { width: 18px; height: 18px; margin: 0; accent-color: var(--primary); }
.footer { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.link { background: none; border: 0; min-height: 36px; padding: 6px 2px; color: var(--muted); text-decoration: underline; }
.link:hover { background: none; color: var(--fg); }
`;

function s(key, subs) {
    return Language.getString(key, subs);
}

export default class UnifiedPopup {
    /**
     * @param {object} options
     * @param {string} options.host        Host of the top-level page
     * @param {string} options.cmpName     Name of the detected CMP rule
     * @param {object} options.subsetValues The user's global "my subset" values {A..X}
     */
    static show(options) {
        if (UnifiedPopup.current != null) {
            return UnifiedPopup.current.promise;
        }
        const popup = new UnifiedPopup(options);
        UnifiedPopup.current = popup;
        popup.promise.finally(()=>{
            UnifiedPopup.current = null;
        });
        return popup.promise;
    }

    constructor({host, cmpName, subsetValues}) {
        // Show the site name the way people recognise it (no port)
        this.host = ("" + host).replace(/:\d+$/, "");
        this.cmpName = cmpName;
        this.subsetValues = Object.assign({}, subsetValues);
        this.previousFocus = document.activeElement;

        this.promise = new Promise((resolve)=>{
            this.resolve = resolve;
        });

        this.render();
    }

    render() {
        this.hostElement = document.createElement("consent-o-matic-plus");
        this.root = this.hostElement.attachShadow({mode: "closed"});

        const style = document.createElement("style");
        style.textContent = STYLE;
        this.root.appendChild(style);

        const enabledNames = CATEGORIES.filter((c)=>this.subsetValues[c.type] === true).map((c)=>s(c.name));
        const subsetSummary = enabledNames.length > 0
            ? s("PLUS_SUBSET_ALLOWS", [null, enabledNames.join(", ")])
            : s("PLUS_SUBSET_NOTHING");

        const backdrop = this.el("div", {class: "backdrop"});
        const dialog = this.el("div", {
            class: "dialog",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "com-plus-title",
            "aria-describedby": "com-plus-desc"
        });

        const brand = this.el("div", {class: "brand"});
        brand.append(document.createTextNode(s("PLUS_NAME")));

        const title = this.el("h2", {id: "com-plus-title"}, s("PLUS_PROMPT_TITLE"));
        const desc = this.el("p", {id: "com-plus-desc"});
        const hostSpan = this.el("span", {class: "host"}, this.host);
        desc.append(hostSpan, document.createTextNode(" " + s("PLUS_PROMPT_BODY")));

        // Accept all / Reject all get identical visual weight on purpose (no dark patterns)
        const row = this.el("div", {class: "row"});
        const acceptAll = this.el("button", {type: "button", class: "primary", "data-action": "acceptAll"}, s("PLUS_ACCEPT_ALL"));
        const rejectAll = this.el("button", {type: "button", class: "primary", "data-action": "rejectAll"}, s("PLUS_REJECT_ALL"));
        row.append(acceptAll, rejectAll);

        const subset = this.el("button", {type: "button", class: "wide", "data-action": "subset"});
        subset.append(
            document.createTextNode(s("PLUS_USE_SUBSET")),
            this.el("span", {class: "sub"}, subsetSummary)
        );

        const customize = this.el("button", {
            type: "button", class: "wide", "data-action": "customize",
            "aria-expanded": "false", "aria-controls": "com-plus-categories"
        });
        customize.append(
            document.createTextNode(s("PLUS_CUSTOMIZE")),
            this.el("span", {class: "sub"}, s("PLUS_CUSTOMIZE_SUB"))
        );

        // Category toggles, pre-filled with "my subset"
        const categories = this.el("fieldset", {class: "categories", id: "com-plus-categories"});
        categories.style.margin = "0 0 10px";
        const legend = this.el("legend", {}, s("PLUS_CUSTOMIZE_LEGEND"));
        legend.style.cssText = "padding: 0 4px; font-weight: 600;";
        categories.appendChild(legend);
        this.categoryInputs = {};
        CATEGORIES.forEach((c)=>{
            const id = "com-plus-cat-" + c.type;
            const wrap = this.el("div", {class: "cat"});
            const input = this.el("input", {type: "checkbox", id: id});
            input.checked = this.subsetValues[c.type] === true;
            const label = this.el("label", {for: id});
            label.append(
                this.el("span", {class: "name"}, s(c.name)),
                this.el("span", {class: "desc"}, s(c.description))
            );
            wrap.append(input, label);
            categories.appendChild(wrap);
            this.categoryInputs[c.type] = input;
        });
        const save = this.el("button", {type: "button", class: "primary", "data-action": "custom"}, s("PLUS_SAVE_CHOICES"));
        save.style.cssText = "width: 100%; margin: 8px 0 6px;";
        categories.appendChild(save);

        const remember = this.el("label", {class: "remember"});
        this.rememberInput = this.el("input", {type: "checkbox"});
        this.rememberInput.checked = true;
        remember.append(this.rememberInput, document.createTextNode(s("PLUS_REMEMBER", [null, this.host])));

        const footer = this.el("div", {class: "footer"});
        const notNow = this.el("button", {type: "button", class: "link", "data-action": "dismiss"}, s("PLUS_NOT_NOW"));
        const settings = this.el("button", {type: "button", class: "link", "data-action": "settings"}, s("PLUS_GLOBAL_SETTINGS"));
        footer.append(notNow, settings);

        dialog.append(brand, title, desc, row, subset, customize, categories, remember, footer);
        backdrop.appendChild(dialog);
        this.root.appendChild(backdrop);

        this.dialog = dialog;
        this.categoriesEl = categories;
        this.customizeButton = customize;

        dialog.addEventListener("click", (evt)=>this.onClick(evt));
        backdrop.addEventListener("keydown", (evt)=>this.onKeyDown(evt));

        (document.body || document.documentElement).appendChild(this.hostElement);

        // Keep the dialog in the page if a script tries to remove it while we wait
        this.removalObserver = new MutationObserver(()=>{
            if (!this.hostElement.isConnected && !this.closed) {
                (document.body || document.documentElement).appendChild(this.hostElement);
            }
        });
        this.removalObserver.observe(document.documentElement, {childList: true, subtree: true});

        acceptAll.focus();
    }

    el(tag, attrs, text) {
        const node = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v])=>node.setAttribute(k, v));
        if (text != null) node.textContent = text;
        return node;
    }

    onClick(evt) {
        // Ignore synthetic clicks dispatched by page scripts
        if (!evt.isTrusted) return;
        const button = evt.target.closest("button[data-action]");
        if (button == null) return;

        const action = button.getAttribute("data-action");
        switch (action) {
            case "acceptAll":
            case "rejectAll":
            case "subset":
                this.finish({mode: action, remember: this.rememberInput.checked});
                break;
            case "customize": {
                const open = !this.categoriesEl.classList.contains("open");
                this.categoriesEl.classList.toggle("open", open);
                this.customizeButton.setAttribute("aria-expanded", "" + open);
                if (open) this.categoryInputs.A.focus();
                break;
            }
            case "custom": {
                const values = {};
                Object.entries(this.categoryInputs).forEach(([type, input])=>{
                    values[type] = input.checked;
                });
                this.finish({mode: "custom", values: values, remember: this.rememberInput.checked});
                break;
            }
            case "settings":
                chrome.runtime.sendMessage("OpenOptions");
                break;
            case "dismiss":
                this.finish(null);
                break;
        }
    }

    onKeyDown(evt) {
        if (!evt.isTrusted) return;
        if (evt.key === "Escape") {
            evt.preventDefault();
            this.finish(null);
            return;
        }
        if (evt.key === "Tab") {
            // Trap focus inside the dialog
            const focusable = Array.from(this.dialog.querySelectorAll("button, input"))
                .filter((n)=>n.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = this.root.activeElement;
            if (evt.shiftKey && (active === first || !this.dialog.contains(active))) {
                evt.preventDefault();
                last.focus();
            } else if (!evt.shiftKey && (active === last || !this.dialog.contains(active))) {
                evt.preventDefault();
                first.focus();
            }
        }
        // Keep the page's own key handlers (e.g. focus traps in the site's banner) out of it
        evt.stopPropagation();
    }

    finish(result) {
        if (this.closed) return;
        this.closed = true;
        this.removalObserver.disconnect();
        this.hostElement.remove();
        try {
            if (this.previousFocus && this.previousFocus.focus) this.previousFocus.focus();
        } catch (e) {
            // ignore
        }
        this.resolve(result);
    }
}

UnifiedPopup.current = null;
