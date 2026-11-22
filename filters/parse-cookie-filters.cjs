/*
 * Consent-O-Manual: turns an AdGuard / uBlock style cookie-notice filter list into the
 * compact JSON the extension uses to *detect* cookie banners.
 *
 * Only element-hiding rules are used:
 *   ##selector               generic: applies on every site
 *   a.com,b.org##selector    site-specific (also applies on subdomains)
 *   ~a.com##selector         generic, except on a.com
 *   a.com#@#selector         exception: selector is not used on a.com (no domain = removed everywhere)
 *
 * Everything else is skipped: network rules (||...), scriptlets (#%#), CSS injection (#$#),
 * extended CSS (#?#), HTML filtering ($$ / ##^), rules with [$...] modifiers, and selectors
 * using non-standard pseudo-classes.
 *
 * Output: {generic: [sel], specific: {domain: [sel]}, exceptions: {domain: [sel]}}
 */

const UNSUPPORTED = /:-abp-|:contains\(|:has-text\(|:matches-css|:matches-attr|:matches-property|:xpath\(|:upward\(|:remove\(|:style\(|:nth-ancestor\(|:min-text-length\(|:watch-attr\(|:others\(|:if\(|:if-not\(|:matches-path\(/;

function parseCookieFilters(text) {
    const generic = new Set();
    const specific = {};
    const exceptions = {};
    const add = (map, domain, selector) => {
        (map[domain] = map[domain] || new Set()).add(selector);
    };

    for (let line of text.split(/\r?\n/)) {
        line = line.trim();
        if (line === "" || line.startsWith("!") || line.startsWith("[")) continue;

        const m = line.match(/^([^#]*?)(#@#|##)(.+)$/);
        if (m == null) continue;                    // network rule or other syntax
        const [, domainPart, separator, selector] = m;
        if (/^[+^]/.test(selector)) continue;      // ##+js(...) scriptlets, ##^ HTML filtering
        if (UNSUPPORTED.test(selector)) continue;
        if (domainPart.includes("$") || domainPart.includes("/")) continue;

        const domains = domainPart.split(",").map((d) => d.trim().toLowerCase()).filter((d) => d !== "");
        const included = domains.filter((d) => !d.startsWith("~"));
        const excluded = domains.filter((d) => d.startsWith("~")).map((d) => d.slice(1));

        if (separator === "#@#") {
            if (included.length === 0) {
                add(exceptions, "*", selector);
            } else {
                included.forEach((d) => add(exceptions, d, selector));
            }
            continue;
        }

        if (included.length === 0) {
            generic.add(selector);
            excluded.forEach((d) => add(exceptions, d, selector));
        } else {
            included.forEach((d) => add(specific, d, selector));
            excluded.forEach((d) => add(exceptions, d, selector));
        }
    }

    // Selectors with a global exception are never used
    const globalExceptions = exceptions["*"] || new Set();
    delete exceptions["*"];
    const toObject = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));

    return {
        generic: [...generic].filter((s) => !globalExceptions.has(s)),
        specific: toObject(specific),
        exceptions: toObject(exceptions)
    };
}

/**
 * Selectors that apply on a host: generic ones (minus exceptions) plus site-specific ones,
 * checking the host and each parent domain (www.news.example.com -> news.example.com -> example.com).
 */
function selectorsForHost(filters, host) {
    host = ("" + host).toLowerCase().replace(/:\d+$/, "");
    const labels = host.split(".");
    const candidates = [];
    for (let i = 0; i < labels.length; i++) {
        candidates.push(labels.slice(i).join("."));
    }

    const excepted = new Set();
    const result = new Set();
    candidates.forEach((d) => {
        (filters.exceptions[d] || []).forEach((s) => excepted.add(s));
    });
    filters.generic.forEach((s) => {
        if (!excepted.has(s)) result.add(s);
    });
    candidates.forEach((d) => {
        (filters.specific[d] || []).forEach((s) => {
            if (!excepted.has(s)) result.add(s);
        });
    });
    return [...result];
}

module.exports = {parseCookieFilters, selectorsForHost};
