/**
 * Consent-O-Manual: cookie banners found with the cookie-notice filter list.
 *
 * The rule files say exactly how to answer a known CMP. The filter list only says which
 * elements are cookie banners, so for a banner found that way we answer generically:
 *
 *   1. Look inside the banner for buttons whose text means Accept or Reject
 *      (several languages; buttons that open settings or policies are ignored).
 *   2. Only "accept everything" or "reject everything" can be answered generically.
 *      A choice that allows every category means Accept; anything else means Reject,
 *      so we never grant more than the user chose.
 *   3. Click the matching button. If there is none, or the banner is still showing after
 *      the click, hide the banner instead. We never click Accept when the answer is Reject.
 */

// Text that means "reject" / "only what's needed". Checked before ACCEPT, so that
// "Accept only necessary" counts as a reject.
const REJECT = [
    /\b(reject|decline|deny|refuse|disagree|disallow)\b/,
    /\b(only|just)\s+(the\s+)?(strictly\s+)?(necessary|essential|required|functional)\b/,
    /\b(necessary|essential|required)\s+(cookies\s+)?only\b/,
    /\b(accept|allow|use)\s+(only\s+)?(strictly\s+)?(necessary|essential|required)\b/,
    /\bcontinue without\b/, /\bdo not (accept|agree|consent)\b/, /\bdon'?t (accept|agree|allow)\b/, /\bno,?\s+thanks?\b/,
    /ablehnen|nur (notwendige|essenzielle|erforderliche)|verweigern/,          // de
    /refuser|continuer sans/,                                                  // fr
    /rechazar|solo (las )?(necesarias|esenciales)/,                            // es
    /rifiuta|solo (necessari|essenziali)/,                                     // it
    /weigeren|alleen (noodzakelijke|functionele)/,                             // nl
    /rejeitar|recusar/,                                                        // pt
    /\bafvis|\bavvisa|\bneka\b|\bavslå|odrzuć|odmítnout|odmietnuť/             // da, sv, no, pl, cs, sk
];

const ACCEPT = [
    /\b(accept|agree|allow|consent)\b/, /\bi understand\b/, /^(ok|okay|got it|understood|continue)\b/,
    /akzeptieren|zustimmen|einverstanden|annehmen/,                            // de
    /accepter|j'accepte|d'accord/,                                             // fr
    /aceptar|acepto/,                                                          // es
    /accett/,                                                                  // it
    /accepteren|akkoord/,                                                      // nl
    /aceitar|aceito|concordo/,                                                 // pt
    /accepter|godkend|acceptera|godkänn|godta|zaakceptuj|akceptuj|zgadzam|souhlasím|přijmout|súhlasím/
];

// Buttons that lead somewhere else rather than answering
const IGNORE = /selection|selected|\bsave\b|confirm (my )?choices|settings|setting|customi[sz]e|manage|preferences|options|more info|learn more|read more|details|policy|privacy|einstellungen|anpassen|paramètres|personnaliser|configur|impostazioni|instellingen|ustawienia|nastavení/;

const BUTTONS = "button, a, [role='button'], input[type='button'], input[type='submit']";

function isVisible(el) {
    if (el == null || !el.isConnected) return false;
    const rects = el.getClientRects();
    if (rects.length === 0) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width * r.height >= 400;
}

function buttonText(el) {
    const text = el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("title") || "";
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function classifyButton(text) {
    if (text === "" || text.length > 60) return null;
    if (REJECT.some((r)=>r.test(text))) return "reject";
    if (IGNORE.test(text)) return null;
    if (ACCEPT.some((r)=>r.test(text))) return "accept";
    return null;
}

/**
 * The id, class or tag the rightmost part of a selector must have, e.g.
 *   "#cookie-bar"                  -> ["id", "cookie-bar"]
 *   "div.notice > .cookie:not(.x)" -> ["class", "cookie"]
 *   "app-cookie-consent"           -> ["tag", "app-cookie-consent"]
 * or null when there is no such key (the selector is then checked with querySelectorAll).
 */
export function selectorKey(selector) {
    if (selector.includes("\\")) return null;
    let depth = 0, quote = null, start = 0;
    for (let i = 0; i < selector.length; i++) {
        const ch = selector[i];
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === "\"" || ch === "'") { quote = ch; continue; }
        if (ch === "[" || ch === "(") depth++;
        else if (ch === "]" || ch === ")") depth--;
        else if (depth === 0 && ch === ",") return null;   // a selector list
        else if (depth === 0 && (ch === " " || ch === ">" || ch === "+" || ch === "~")) start = i + 1;
    }
    // Rightmost compound selector, without [attribute] and (:pseudo arguments)
    let compound = "";
    depth = 0; quote = null;
    for (const ch of selector.slice(start).trim()) {
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === "\"" || ch === "'") { quote = ch; continue; }
        if (ch === "[" || ch === "(") { depth++; continue; }
        if (ch === "]" || ch === ")") { depth--; continue; }
        if (depth === 0) compound += ch;
    }
    let m = compound.match(/#([\w-]+)/);
    if (m) return ["id", m[1]];
    m = compound.match(/\.([\w-]+)/);
    if (m) return ["class", m[1]];
    m = compound.match(/^([a-zA-Z][\w-]*)/);
    if (m) return ["tag", m[1].toLowerCase()];
    return null;
}

/**
 * Finds the selectors from the filter list that match a visible element on the page.
 *
 * Checking ~1700 selectors with querySelectorAll walks the whole page for each one (hundreds of
 * milliseconds on a big page). Almost every selector needs a specific id or class, so instead we
 * look those up directly (getElementById / getElementsByClassName) and only run the full selector
 * on the few elements that come back.
 */
export class FilterListDetector {
    constructor(selectors) {
        this.byId = new Map();
        this.byClass = new Map();
        this.byTag = new Map();
        this.other = [];
        for (const selector of selectors) {
            if (!FilterListDetector.isValid(selector)) continue;
            const key = selectorKey(selector);
            if (key == null) {
                this.other.push(selector);
                continue;
            }
            const map = key[0] === "id" ? this.byId : key[0] === "class" ? this.byClass : this.byTag;
            if (!map.has(key[1])) map.set(key[1], []);
            map.get(key[1]).push(selector);
        }
    }

    static isValid(selector) {
        try {
            document.createDocumentFragment().querySelector(selector);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Every {element, selector} on the page that matches a selector from the list
    *matches() {
        const check = function* (element, selectors) {
            for (const selector of selectors) {
                let ok = false;
                try { ok = element.matches(selector); } catch (e) { /* ignore */ }
                if (ok) {
                    yield {element, selector};
                    return;
                }
            }
        };
        for (const [id, selectors] of this.byId) {
            const element = document.getElementById(id);
            if (element != null) yield* check(element, selectors);
        }
        for (const [name, selectors] of this.byClass) {
            for (const element of document.getElementsByClassName(name)) yield* check(element, selectors);
        }
        for (const [tag, selectors] of this.byTag) {
            for (const element of document.getElementsByTagName(tag)) yield* check(element, selectors);
        }
        for (const selector of this.other) {
            let found;
            try { found = document.querySelectorAll(selector); } catch (e) { continue; }
            for (const element of found) yield {element, selector};
        }
    }

    /**
     * Returns {element, selector} for the best visible match, or null.
     * Prefers a match that contains an Accept or Reject button.
     */
    scan() {
        let fallback = null;
        for (const found of this.matches()) {
            const element = found.element;
            if (element === document.body || element === document.documentElement) continue;
            if (!isVisible(element)) continue;
            const buttons = findButtons(element);
            if (buttons.accept != null || buttons.reject != null) {
                return found;
            }
            if (fallback == null && (element.innerText || "").trim().length >= 20) {
                fallback = found;
            }
        }
        return fallback;
    }
}

/**
 * Finds the first visible Accept and Reject buttons inside a banner.
 */
export function findButtons(element) {
    const result = {accept: null, reject: null};
    const candidates = element.matches(BUTTONS) ? [element] : Array.from(element.querySelectorAll(BUTTONS));
    for (const button of candidates) {
        if (!isVisible(button)) continue;
        const kind = classifyButton(buttonText(button));
        if (kind != null && result[kind] == null) {
            result[kind] = button;
        }
    }
    return result;
}

/**
 * Answers a banner found with the filter list.
 * @param element          the banner
 * @param decisionProvider async (cmpName, options) => consent values {A..X} or null
 * @returns {mode: "acceptAll"|"rejectAll"|"hidden", clicks, oneClick: {accept, reject}}
 *          or null if the user chose "Not now"
 */
export async function answerFilterListBanner(element, decisionProvider) {
    const values = await decisionProvider("Cookie filter list", {limited: true});
    if (values == null) return null;

    const acceptEverything = Object.values(values).length > 0 && Object.values(values).every((v)=>v === true);
    const want = acceptEverything ? "accept" : "reject";
    const buttons = findButtons(element);
    const button = buttons[want];
    const oneClick = {accept: buttons.accept != null, reject: buttons.reject != null};

    if (button != null) {
        button.click();
        await new Promise((resolve)=>setTimeout(resolve, 1500));
        if (!isVisible(element)) {
            return {mode: acceptEverything ? "acceptAll" : "rejectAll", clicks: 1, oneClick};
        }
    }

    // No matching button, or the click didn't close it: hide the banner without consenting
    hideBanner(element);
    return {mode: "hidden", clicks: button != null ? 1 : 0, oneClick};
}

function hideBanner(element) {
    element.setAttribute("data-consent-o-manual-hidden", "");
    element.style.setProperty("display", "none", "important");
    // Banners often lock page scrolling; give it back
    [document.documentElement, document.body].forEach((node)=>{
        if (node == null) return;
        const style = getComputedStyle(node);
        if (style.overflow === "hidden" || style.overflowY === "hidden") {
            node.style.setProperty("overflow", "auto", "important");
        }
        if (style.position === "fixed" && node === document.body) {
            node.style.setProperty("position", "static", "important");
        }
    });
}
