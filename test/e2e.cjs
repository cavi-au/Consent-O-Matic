/*
 * Consent-O-Matic Plus end-to-end test.
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
    const framed = '<!DOCTYPE html><html><body><h1>Framed</h1><iframe src="/" style="width:100%;height:600px"></iframe></body></html>';
    const server = http.createServer((req, res)=>{
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(req.url.startsWith("/framed") ? framed : html);
    });
    return new Promise((resolve)=>server.listen(PORT, ()=>resolve(server)));
}

async function siteConsent(page) {
    await page.waitForFunction(()=>document.getElementById("consent-status").textContent !== "none yet", null, {timeout: 15000});
    return JSON.parse(await page.textContent("#consent-status"));
}

async function popupShown(page) {
    await page.waitForSelector("consent-o-matic-plus", {state: "attached", timeout: 15000});
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

        console.log("Consent-O-Matic Plus e2e");

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
            assert.strictEqual(await page.$("consent-o-matic-plus"), null, "popup should not be shown");
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
            assert.strictEqual(await page.$("consent-o-matic-plus"), null, "popup should not be shown");
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
