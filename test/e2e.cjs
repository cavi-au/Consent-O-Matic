/*
 * Consent-O-Manual end-to-end test.
 *
 * Loads the built Chromium extension (build/) into Chromium, serves demo-site/ locally and checks
 * that the unified popup, per-site preferences and global settings drive the PlusDemoCMP banner.
 *
 *   npm run build-chromium && npm run test:e2e
 */
const {chromium} = require("playwright");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const EXTENSION = path.join(ROOT, "build");
const PORT = 8765;

function serveDemoSite() {
    const html = fs.readFileSync(path.join(ROOT, "demo-site", "index.html"));
    const filterListHtml = fs.readFileSync(path.join(ROOT, "demo-site", "filter-list.html"));
    const framed = '<!DOCTYPE html><html><body><h1>Framed</h1><iframe src="/" style="width:100%;height:600px"></iframe></body></html>';
    const server = http.createServer((req, res)=>{
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(req.url.startsWith("/framed") ? framed : req.url.startsWith("/filter-list") ? filterListHtml : html);
    });
    return new Promise((resolve)=>server.listen(PORT, ()=>resolve(server)));
}

async function siteConsent(page) {
    await page.waitForFunction(()=>document.getElementById("consent-status").textContent !== "none yet", null, {timeout: 15000});
    return JSON.parse(await page.textContent("#consent-status"));
}

async function popupShown(page) {
    await page.waitForSelector("consent-o-manual", {state: "attached", timeout: 15000});
}

async function main() {
    assert(fs.existsSync(path.join(EXTENSION, "manifest.json")), "Run `npm run build-chromium` first");
    const server = await serveDemoSite();
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "com-plus-"));
    const context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        headless: true,
        args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`]
    });

    let failures = 0;
    async function test(name, fn) {
        try {
            await fn();
            console.log("  ✔ " + name);
        } catch (e) {
            failures++;
            console.log("  ✘ " + name + "\n    " + (e.stack || e));
        }
    }

    try {
        let [worker] = context.serviceWorkers();
        if (!worker) worker = await context.waitForEvent("serviceworker");

        const storage = (fn, arg)=>worker.evaluate(fn, arg);
        async function reset() {
            await context.clearCookies();
            await storage(()=>new Promise((r)=>chrome.storage.local.set({sitePreferences: {}}, r)));
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({
                generalSettings: {defaultMode: "ask"},
                consentValues: {A: false, B: false, D: false, E: false, F: false, X: false}
            }, r)));
        }

        // Close the onboarding tab the extension opens on first run
        await new Promise((r)=>setTimeout(r, 1000));
        for (const p of context.pages()) {
            if (p.url().startsWith("chrome-extension://")) await p.close();
        }

        console.log("Consent-O-Manual e2e");

        await test("unified popup appears and 'Reject all non-essential' rejects everything", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            // Keyboard only: Accept all is focused first, Tab moves to Reject all
            await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");
            assert.deepStrictEqual(await siteConsent(page), {functional: false, analytics: false, marketing: false});
            const prefs = await storage(()=>new Promise((r)=>chrome.storage.local.get("sitePreferences", (x)=>r(x.sitePreferences))));
            assert.strictEqual(prefs["localhost"].mode, "rejectAll");
            await page.close();
        });

        await test("remembered site choice is applied silently on the next visit", async ()=>{
            await context.clearCookies();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            assert.deepStrictEqual(await siteConsent(page), {functional: false, analytics: false, marketing: false});
            assert.strictEqual(await page.$("consent-o-manual"), null, "popup should not be shown");
            await page.close();
        });

        await test("'Accept all' accepts everything", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            await page.keyboard.press("Enter");
            assert.deepStrictEqual(await siteConsent(page), {functional: true, analytics: true, marketing: true});
            await page.close();
        });

        await test("'Use my preferences' applies the global subset", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({
                consentValues: {A: false, B: true, D: false, E: false, F: false, X: false}
            }, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");
            assert.deepStrictEqual(await siteConsent(page), {functional: false, analytics: true, marketing: false});
            await page.close();
        });

        await test("'Customize' lets the user pick categories for this site", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");        // open Customize, focus moves to first category
            await page.keyboard.press("Space");        // Preferences/functional on
            for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
            await page.keyboard.press("Space");        // Ads/marketing (F) on
            await page.keyboard.press("Tab");          // Other
            await page.keyboard.press("Tab");          // Save
            await page.keyboard.press("Enter");
            assert.deepStrictEqual(await siteConsent(page), {functional: true, analytics: false, marketing: true});
            const prefs = await storage(()=>new Promise((r)=>chrome.storage.local.get("sitePreferences", (x)=>r(x.sitePreferences))));
            assert.strictEqual(prefs["localhost"].mode, "custom");
            assert.strictEqual(prefs["localhost"].values.F, true);
            await page.close();
        });

        await test("'Not now' leaves the site's own banner untouched", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(1000);
            assert.strictEqual(await page.textContent("#consent-status"), "none yet");
            assert(await page.isVisible("#plus-demo-cmp"), "site banner should still be visible");
            await page.close();
        });

        await test("CMP inside an iframe is answered through the popup in the top frame", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/framed`);
            await popupShown(page);   // shown in the top document, not the iframe
            await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");
            const frame = page.frames().find((f)=>f !== page.mainFrame());
            assert.deepStrictEqual(await siteConsent(frame), {functional: false, analytics: false, marketing: false});
            await page.close();
        });

        await test("global 'reject all' mode handles banners without asking", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://127.0.0.1:${PORT}/`);
            assert.deepStrictEqual(await siteConsent(page), {functional: false, analytics: false, marketing: false});
            assert.strictEqual(await page.$("consent-o-manual"), null, "popup should not be shown");
            await page.close();
        });

        await test("per-site override beats the global setting", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll"}}, r)));
            await storage(()=>new Promise((r)=>chrome.storage.local.set({sitePreferences: {"127.0.0.1": {mode: "acceptAll"}}}, r)));
            const page = await context.newPage();
            await page.goto(`http://127.0.0.1:${PORT}/`);
            assert.deepStrictEqual(await siteConsent(page), {functional: true, analytics: true, marketing: true});
            await page.close();
        });

        await test("popup style setting: card by default, banner when chosen", async ()=>{
            await reset();
            let page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            assert.strictEqual(await page.getAttribute("consent-o-manual", "data-style"), "card");
            await page.close();

            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "ask", popupStyle: "banner"}}, r)));
            page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await popupShown(page);
            assert.strictEqual(await page.getAttribute("consent-o-manual", "data-style"), "banner");
            // Same buttons, same keyboard order in the banner layout
            await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");
            assert.deepStrictEqual(await siteConsent(page), {functional: false, analytics: false, marketing: false});
            await page.close();
        });

        await test("green notification appears after an action and disappears after 5 seconds", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            await siteConsent(page);
            await page.waitForSelector("consent-o-manual-toast", {state: "attached", timeout: 5000});
            assert.strictEqual(await page.getAttribute("consent-o-manual-toast", "data-mode"), "rejectAll");
            const shownAt = Date.now();
            await page.waitForSelector("consent-o-manual-toast", {state: "detached", timeout: 8000});
            const shownFor = Date.now() - shownAt;
            assert(shownFor > 4000 && shownFor < 7000, "toast should stay about 5 s, stayed " + shownFor + " ms");
            await page.close();
        });

        await test("notification can be turned off in settings", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "acceptAll", showNotifications: false}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/`);
            assert.deepStrictEqual(await siteConsent(page), {functional: true, analytics: true, marketing: true});
            await page.waitForTimeout(1000);
            assert.strictEqual(await page.$("consent-o-manual-toast"), null, "toast should not be shown");
            await page.close();
        });

        await test("notification for an iframe CMP is shown in the top frame", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "acceptAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/framed`);
            await page.waitForSelector("consent-o-manual-toast", {state: "attached", timeout: 15000});
            assert.strictEqual(await page.getAttribute("consent-o-manual-toast", "data-mode"), "acceptAll");
            await page.close();
        });

        async function filterListStatus(page) {
            await page.waitForFunction(()=>document.getElementById("consent-status").textContent !== "none yet", null, {timeout: 15000});
            return page.textContent("#consent-status");
        }

        await test("filter list: banner with no rule is rejected with its Reject button", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list`);
            assert.strictEqual(await filterListStatus(page), "rejected");
            await page.waitForSelector("consent-o-manual-toast", {state: "attached", timeout: 5000});
            assert.strictEqual(await page.getAttribute("consent-o-manual-toast", "data-mode"), "rejectAll");
            await page.close();
        });

        await test("filter list: 'accept all' clicks the Accept button", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "acceptAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list`);
            assert.strictEqual(await filterListStatus(page), "accepted");
            await page.close();
        });

        await test("filter list: partial preferences are answered with Reject, never Accept", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({
                generalSettings: {defaultMode: "subset"},
                consentValues: {A: true, B: true, D: true, E: true, F: false, X: true}
            }, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list`);
            assert.strictEqual(await filterListStatus(page), "rejected");
            await page.close();
        });

        await test("filter list: 'ask' shows the Accept/Reject-only popup and remembers the answer", async ()=>{
            await reset();
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list`);
            await popupShown(page);
            await page.keyboard.press("Tab");          // Reject all
            await page.keyboard.press("Enter");
            assert.strictEqual(await filterListStatus(page), "rejected");
            const prefs = await storage(()=>new Promise((r)=>chrome.storage.local.get("sitePreferences", (x)=>r(x.sitePreferences))));
            assert.strictEqual(prefs["localhost"].mode, "rejectAll");
            await page.close();
        });

        await test("filter list: banner without a Reject button is hidden, not accepted", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll"}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list?variant=accept-only`);
            await page.waitForSelector("consent-o-manual-toast", {state: "attached", timeout: 15000});
            assert.strictEqual(await page.getAttribute("consent-o-manual-toast", "data-mode"), "hidden");
            assert.strictEqual(await page.textContent("#consent-status"), "none yet");
            assert.strictEqual(await page.isVisible(".gdpr_wrapper"), false, "banner should be hidden");
            assert.strictEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow), "auto", "scrolling should be restored");
            await page.close();
        });

        await test("filter list can be turned off", async ()=>{
            await reset();
            await storage(()=>new Promise((r)=>chrome.storage.sync.set({generalSettings: {defaultMode: "rejectAll", useCookieFilterList: false}}, r)));
            const page = await context.newPage();
            await page.goto(`http://localhost:${PORT}/filter-list`);
            await page.waitForTimeout(3500);
            assert.strictEqual(await page.textContent("#consent-status"), "none yet");
            assert(await page.isVisible(".gdpr_wrapper"), "banner should be left alone");
            await page.close();
        });
    } finally {
        await context.close();
        server.close();
    }

    console.log(failures === 0 ? "All tests passed" : failures + " test(s) failed");
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((e)=>{
    console.error(e);
    process.exit(1);
});
