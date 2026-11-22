import Language from "./Language.js";

/**
 * Consent-O-Manual unified consent popup.
 *
 * Shown in the top frame when a CMP is detected and the resolved mode is "ask".
 * It replaces every site's own banner with one consistent, accessible dialog:
 *
 *   - Accept all
 *   - Reject all non-essential
 *   - Use my preferences   (the "my subset" categories chosen in the options page)
 *   - Customize            (pick categories for this site only)
 *
 * Two layouts, chosen in the options page (generalSettings.popupStyle):
 *   - "card":   a card in the centre of the screen
 *   - "banner": a full-width banner along the bottom of the screen
 *
 * With `limited: true` (a banner found only through the cookie filter list) the popup offers just
 * Accept all / Reject all, because such banners can't be answered category by category.
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

export const STYLES = ["card", "banner"];

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.backdrop {
    position: fixed; inset: 0;
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.40);
    font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    /* Consent-O-Manual palette: white surfaces, blue buttons and details */
    --bg: #ffffff; --fg: #0f172a; --muted: #475569; --line: #dbe3f4;
    --blue: #1d4ed8; --blue-hover: #1e40af; --blue-soft: #eff4ff; --on-blue: #ffffff;
    --focus: #f59e0b;
    color: var(--fg);
}
.dialog {
    width: 100%; max-width: 520px; max-height: calc(100vh - 32px); overflow: auto;
    background: var(--bg); color: var(--fg);
    border: 1px solid var(--line); border-top: 4px solid var(--blue);
    border-radius: 14px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.30);
    padding: 20px 22px 14px;
}
.brand { display: flex; align-items: center; gap: 8px; color: var(--blue); font-size: 13px;
    font-weight: 700; letter-spacing: .02em; margin-bottom: 6px; }
.brand img { width: 26px; height: 26px; }
h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.25; }
p { margin: 0 0 14px; color: var(--muted); }
.host { color: var(--fg); font-weight: 600; word-break: break-all; }
.note { font-size: 13px; background: var(--blue-soft); border-radius: 8px; padding: 8px 10px; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.actions .wide { grid-column: 1 / -1; }
@media (max-width: 380px) { .actions { grid-template-columns: 1fr; } }
button {
    font: inherit; cursor: pointer; border-radius: 10px; min-height: 44px;
    padding: 10px 14px; text-align: center;
    border: 1.5px solid var(--blue); background: var(--bg); color: var(--blue); font-weight: 600;
}
button:hover { background: var(--blue-soft); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button.primary { background: var(--blue); color: var(--on-blue); }
button.primary:hover { background: var(--blue-hover); border-color: var(--blue-hover); }
button.wide { text-align: left; }
button.wide .sub { display: block; font-size: 13px; font-weight: 400; color: var(--muted); margin-top: 2px; }
.categories { display: none; border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; margin: 0 0 10px; }
.categories.open { display: block; }
.categories legend { padding: 0 4px; font-weight: 600; color: var(--blue); }
.cat-list { display: grid; grid-template-columns: 1fr; }
.cat { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--line); }
.cat input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; accent-color: var(--blue); }
.cat label { cursor: pointer; }
.cat .name { font-weight: 600; display: block; }
.cat .desc { font-size: 13px; color: var(--muted); display: block; }
.save { width: 100%; margin: 8px 0 6px; }
.bottom { display: flex; align-items: center; justify-content: space-between; gap: 6px 16px; flex-wrap: wrap; }
.remember { display: flex; gap: 8px; align-items: center; color: var(--muted); font-size: 14px; }
.remember input { width: 18px; height: 18px; margin: 0; accent-color: var(--blue); }
.links { display: flex; gap: 14px; flex-wrap: wrap; }
.link { background: none; border: 0; min-height: 36px; padding: 6px 2px; color: var(--blue);
    text-decoration: underline; font-weight: 500; }
.link:hover { background: none; color: var(--blue-hover); }

/* ---- Banner layout: full width along the bottom of the screen ---- */
.style-banner { align-items: flex-end; padding: 0; background: rgba(15, 23, 42, 0.20); }
.style-banner .dialog {
    max-width: none; max-height: 75vh;
    border-radius: 14px 14px 0 0; border-bottom: 0; border-left: 0; border-right: 0;
    padding: 18px max(24px, calc((100vw - 1200px) / 2)) 12px;
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 600px); column-gap: 32px;
    align-items: center;
}
.style-banner .intro p { margin-bottom: 8px; }
.style-banner .actions { grid-template-columns: repeat(2, 1fr); margin-bottom: 8px; }
.style-banner .actions .wide { grid-column: auto; }
.style-banner .categories, .style-banner .bottom { grid-column: 1 / -1; }
.style-banner .cat-list { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); column-gap: 24px; }
.style-banner .save { width: auto; min-width: 220px; }
@media (max-width: 760px) {
    .style-banner .dialog { grid-template-columns: 1fr; padding: 16px; }
    .style-banner .actions .wide { grid-column: 1 / -1; }
}
`;

function s(key, subs) {
    return Language.getString(key, subs);
}

export default class UnifiedPopup {
    /**
     * @param {object} options
     * @param {string} options.host         Host of the top-level page
     * @param {string} options.cmpName      Name of the detected CMP rule
     * @param {object} options.subsetValues The user's global "my subset" values {A..X}
     * @param {string} options.style        "card" (default) or "banner"
     * @param {boolean} options.limited     Only offer Accept all / Reject all
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

    constructor({host, cmpName, subsetValues, style, limited}) {
        // Show the site name the way people recognise it (no port)
        this.host = ("" + host).replace(/:\d+$/, "");
        this.cmpName = cmpName;
        this.subsetValues = Object.assign({}, subsetValues);
        this.style = STYLES.includes(style) ? style : "card";
        this.limited = limited === true;
        this.previousFocus = document.activeElement;

        this.promise = new Promise((resolve)=>{
            this.resolve = resolve;
        });

        this.render();
    }

    render() {
        this.hostElement = document.createElement("consent-o-manual");
        this.hostElement.setAttribute("data-style", this.style);
        this.root = this.hostElement.attachShadow({mode: "closed"});

        const style = document.createElement("style");
        style.textContent = STYLE;
        this.root.appendChild(style);

        const enabledNames = CATEGORIES.filter((c)=>this.subsetValues[c.type] === true).map((c)=>s(c.name));
        const subsetSummary = enabledNames.length > 0
            ? s("PLUS_SUBSET_ALLOWS", [null, enabledNames.join(", ")])
            : s("PLUS_SUBSET_NOTHING");

        const backdrop = this.el("div", {class: "backdrop style-" + this.style});
        const dialog = this.el("div", {
            class: "dialog",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "com-plus-title",
            "aria-describedby": "com-plus-desc"
        });

        // Intro: logo, name, title and explanation
        const intro = this.el("div", {class: "intro"});
        const brand = this.el("div", {class: "brand"});
        brand.append(this.el("img", {src: chrome.runtime.getURL("logo.png"), alt: ""}), document.createTextNode(s("PLUS_NAME")));
        const title = this.el("h2", {id: "com-plus-title"}, s("PLUS_PROMPT_TITLE"));
        const desc = this.el("p", {id: "com-plus-desc"});
        desc.append(this.el("span", {class: "host"}, this.host), document.createTextNode(" " + s("PLUS_PROMPT_BODY")));
        intro.append(brand, title, desc);

        // Actions. Accept all / Reject all get identical visual weight on purpose (no dark patterns)
        const actions = this.el("div", {class: "actions"});
        const acceptAll = this.el("button", {type: "button", class: "primary", "data-action": "acceptAll"}, s("PLUS_ACCEPT_ALL"));
        const rejectAll = this.el("button", {type: "button", class: "primary", "data-action": "rejectAll"}, s("PLUS_REJECT_ALL"));
        const subset = this.el("button", {type: "button", class: "wide", "data-action": "subset"});
        subset.append(document.createTextNode(s("PLUS_USE_SUBSET")), this.el("span", {class: "sub"}, subsetSummary));
        const customize = this.el("button", {
            type: "button", class: "wide", "data-action": "customize",
            "aria-expanded": "false", "aria-controls": "com-plus-categories"
        });
        customize.append(document.createTextNode(s("PLUS_CUSTOMIZE")), this.el("span", {class: "sub"}, s("PLUS_CUSTOMIZE_SUB")));
        if (this.limited) {
            actions.append(acceptAll, rejectAll);
            intro.appendChild(this.el("p", {class: "note"}, s("PLUS_LIMITED_NOTE")));
        } else {
            actions.append(acceptAll, rejectAll, subset, customize);
        }

        // Category toggles, pre-filled with "my subset"
        const categories = this.el("fieldset", {class: "categories", id: "com-plus-categories"});
        categories.appendChild(this.el("legend", {}, s("PLUS_CUSTOMIZE_LEGEND")));
        const catList = this.el("div", {class: "cat-list"});
        this.categoryInputs = {};
        CATEGORIES.forEach((c)=>{
            const id = "com-plus-cat-" + c.type;
            const wrap = this.el("div", {class: "cat"});
            const input = this.el("input", {type: "checkbox", id: id});
            input.checked = this.subsetValues[c.type] === true;
            const label = this.el("label", {for: id});
            label.append(this.el("span", {class: "name"}, s(c.name)), this.el("span", {class: "desc"}, s(c.description)));
            wrap.append(input, label);
            catList.appendChild(wrap);
            this.categoryInputs[c.type] = input;
        });
        categories.appendChild(catList);
        categories.appendChild(this.el("button", {type: "button", class: "primary save", "data-action": "custom"}, s("PLUS_SAVE_CHOICES")));

        // Remember checkbox and links
        const bottom = this.el("div", {class: "bottom"});
        const remember = this.el("label", {class: "remember"});
        this.rememberInput = this.el("input", {type: "checkbox"});
        this.rememberInput.checked = true;
        remember.append(this.rememberInput, document.createTextNode(s("PLUS_REMEMBER", [null, this.host])));
        const links = this.el("div", {class: "links"});
        links.append(
            this.el("button", {type: "button", class: "link", "data-action": "dismiss"}, s("PLUS_NOT_NOW")),
            this.el("button", {type: "button", class: "link", "data-action": "settings"}, s("PLUS_GLOBAL_SETTINGS"))
        );
        bottom.append(remember, links);

        if (this.limited) {
            dialog.append(intro, actions, bottom);
        } else {
            dialog.append(intro, actions, categories, bottom);
        }
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
