import CMP from "./CMP.js";
import {answerFilterListBanner, findButtons} from "./FilterListCMP.js";
import Tools from "./Tools.js";

export default class ConsentEngine {
    constructor(config, consentTypes, handledCallback) {
        let self = this;

        this.consentTypes = consentTypes;

        this.cmps = [];

        this.handledCallback = handledCallback;

        this.triedCMPs = new Set();

        this.numClicks = 0;
        this.pipEnabled = false;

        Object.keys(config).forEach((key) => {
            try {
                self.cmps.push(new CMP(key, config[key]));
            } catch (err) {
                console.groupCollapsed("Invalid CMP (" + key + ") detected, please update GDPR consent engine or fix the rule generating this error:");
                console.error(err);
                console.groupEnd();
            }
        });

        this.cmps.sort((cmp1, cmp2) => {
            if (cmp1.isUtility()) {
                return -1;
            } else if (cmp2.isUtility()) {
                return 1;
            } else {
                return 0;
            }
        })

        this.setupObserver();
        this.startObserver();

        this.startStopTimeout();

        window.addEventListener("DOMContentLoaded", ()=>{
            self.handleMutations([]);
        });
        this.domScannerIntervalID = setInterval(()=>{
            self.handleMutations([]);
        }, 500);
    }


    /**
     * Generates or removes a temporary custom stylesheet that enforces the currently stored scroll behaviours
     */
    static enforceScrollBehaviours(shouldEnforce) {
        //Make sure we enforce on parent if inside iframe
        let insideIframe = window !== window.parent;
    
        if(insideIframe) {
            //find top most window
            let top = window.parent;
            while(top !== top.parent){
                top = top.parent;
            }

            chrome.runtime.sendMessage("GetTabUrl", (url)=>{
                url = url.substring(0, url.indexOf("/", 8));
                top.postMessage({"enforceScrollBehaviours": shouldEnforce}, url);
            });
        }
    
        let stylesheetElement = document.querySelector("#consent-scrollbehaviour-override");
        if (stylesheetElement) {
            stylesheetElement.textContent = "";
        }

        document.querySelector("html").classList.remove("consent-scrollbehaviour-override");
        document.querySelector("body").classList.remove("consent-scrollbehaviour-override");

        if (!shouldEnforce) return;

        document.querySelector("html").classList.add("consent-scrollbehaviour-override");
        document.querySelector("body").classList.add("consent-scrollbehaviour-override");

        if (!stylesheetElement) {
            stylesheetElement = document.createElement("style");
            stylesheetElement.id = "consent-scrollbehaviour-override";
            document.documentElement.appendChild(stylesheetElement);
        }
        let content = Object.entries(window.consentScrollBehaviours).map(entry => {
            const [element, rules] = entry;
            return element + "{" + rules.map(rule => {
                let hasImportant = rule.value.includes("important");
                return rule.property + ":" + rule.value + (hasImportant ? "" : "!important");
            }).join(";") + "}";
        }).join("");
        if (ConsentEngine.debugValues.debugLog) {
            console.log(content);
        }
        stylesheetElement.textContent = content;
    }


    enablePip() {
        this.pipEnabled = true;
        if (this.modal != null) {
            this.modal.classList.add("ConsentOMatic-PIP")
        }
        ConsentEngine.enforceScrollBehaviours(true);
    }

    registerClick() {
        let clickFraction = 1 / this.currentMethodStepsTotal;

        this.numClicks++;

        if (this.currentMethodFraction == 0) {
            this.currentMethodFraction = clickFraction;
        } else {
            let rest = 1 - this.currentMethodFraction;

            this.currentMethodFraction += rest * (clickFraction / 2.0);
        }

        this.calculateProgress();
    }

    getClicksSoFar() {
        return this.numClicks;
    }

    currentMethodDone() {
        this.completedSteps += this.currentMethodStepsTotal;
        this.currentMethodFraction = 1;
        this.calculateProgress();
        this.currentMethodStepsTotal = 0;
        this.currentMethodFraction = 0;
    }

    startStopTimeout() {
        const self = this;

        if (this.stopEngineId != null) {
            clearTimeout(this.stopEngineId);
        }

        this.stopEngineId = setTimeout(() => {
            if (ConsentEngine.debugValues.debugLog) {
                console.log("No CMP detected in 5 seconds, stopping engine...");
            }

            if(self.queueId != null) {
                clearTimeout(self.queueId);
            }

            clearInterval(self.domScannerIntervalID);

            self.handledCallback({
                handled: false
            });
            this.stopObserver();
        }, 5000);
    }

    async handleMutations(mutations) {
        const self = this;

        if (this.queueId == null && !self.checkRunning) {
            this.queueId = setTimeout(async () => {
                self.queueId = null;
                try {
                    self.checkForCMPs();
                } catch (e) {
                    console.error(e);
                }
            }, 250);
        }
    }

    async checkForCMPs() {
        const self = this;

        self.checkRunning = true;

        //Wait for a super small while, to make async
        await new Promise((resolve)=>{
            setTimeout(()=>{
                resolve();
            }, 0);
        });

        if (ConsentEngine.debugValues.debugLog) {
            console.groupCollapsed("findCMP");
        }
        let cmps = this.findCMP();
        if (ConsentEngine.debugValues.debugLog) {
            console.groupEnd();
        }

        cmps = cmps.filter((cmp) => {
            return !self.triedCMPs.has(cmp.name);
        });

        if (cmps.length > 0) {
            this.stopObserver();

            if (cmps.length > 1) {
                console.warn("Found multiple CMPS's maybee rewise detection rules...", cmps);
            }

            let cmp = cmps[0];

            if (ConsentEngine.debugValues.debugLog) {
                console.log("CMP Detected: ", cmp.name);
                console.groupCollapsed(cmp.name + " - isShowing?");
            }

            this.triedCMPs.add(cmp.name);

            //Check if popup shows, then do consent stuff
            let numberOfTries = 5;
            async function checkIsShowing() {
                if (cmp.isShowing()) {
                    self.currentCMP = cmp;
                    if (ConsentEngine.debugValues.debugLog) {
                        console.groupEnd();
                        console.log(cmp.name + " - Showing");
                    }
                    setTimeout(async () => {
                        if (cmp.isUtility()) {
                            if (ConsentEngine.debugValues.debugLog) {
                                console.groupCollapsed(cmp.name + " - UTILITY");
                            }
                            await cmp.runMethod("UTILITY", self.consentTypes);
                            if (ConsentEngine.debugValues.debugLog) {
                                console.groupEnd();
                            }
                            if (!ConsentEngine.debugValues.skipHideMethod) {
                                if (!ConsentEngine.debugValues.dontHideProgressDialog) {
                                    cmp.stopObservers();
                                }
                            }

                            self.checkRunning = false;

                            self.startObserver();
                            self.handleMutations([]);
                        } else {
                            // Consent-O-Manual: decide what to answer (per-site preference,
                            // global setting, or ask the user via the unified popup) before touching the CMP
                            clearTimeout(self.stopEngineId);
                            // Before anything is hidden: does the site's banner already offer a
                            // one-click Accept / Reject? Used for the "clicks saved" statistic.
                            const oneClick = self.findOneClickButtons(cmp);
                            if (ConsentEngine.decisionProvider != null) {
                                let decision = null;
                                try {
                                    decision = await ConsentEngine.decisionProvider(cmp.name);
                                } catch (e) {
                                    console.error("Consent-O-Manual: could not resolve a decision:", e);
                                }

                                if (decision == null) {
                                    // User chose "Not now" (or something failed): leave the site's own banner alone
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.log(cmp.name + " - no decision, leaving CMP untouched");
                                    }
                                    clearInterval(self.domScannerIntervalID);
                                    self.checkRunning = false;
                                    self.handledCallback({
                                        handled: false,
                                        dismissed: true
                                    });
                                    return;
                                }

                                self.consentTypes = decision;
                            }

                            try {
                                self.numClicks = 0;

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    self.showProgressDialog("Handling " + cmp.name + "...");
                                }

                                self.totalSteps = cmp.getNumSteps();
                                self.completedSteps = 0;
                                self.currentMethodStepsTotal = 0;
                                self.currentMethodFraction = 0;
                                self.updateProgress(0);

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - HIDE_CMP");
                                    }
                                    await cmp.runMethod("HIDE_CMP", self.consentTypes);

                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }
                                if(!ConsentEngine.debugValues.skipOpenMethod) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - OPEN_OPTIONS");
                                    }
                                }
                                await cmp.runMethod("OPEN_OPTIONS", self.consentTypes);
                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupEnd();
                                }

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - HIDE_CMP");
                                    }
                                    await cmp.runMethod("HIDE_CMP", self.consentTypes);
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }

                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupCollapsed(cmp.name + " - DO_CONSENT");
                                }
                                await cmp.runMethod("DO_CONSENT", self.consentTypes);
                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupEnd();
                                }

                                if (!ConsentEngine.debugValues.skipSubmit) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - SAVE_CONSENT");
                                    }
                                    await cmp.runMethod("SAVE_CONSENT", self.consentTypes);
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }
                                if (!(self.numClicks > 0)) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.log("Consent-O-Matic click count was 0 for CMP:", self.numClicks, cmp.name);
                                    }
                                    self.numClicks = 0; // Catch-all for NaN, negative numbers etc.
                                }

                                self.updateProgress(1.0);

                                self.handledCallback({
                                    handled: true,
                                    cmpName: cmp.name,
                                    clicks: self.numClicks,
                                    values: self.consentTypes,
                                    oneClick: oneClick
                                });
                            } catch (e) {
                                console.log("Error during consent handling:", e);
                                self.handledCallback({
                                    handled: false,
                                    error: true
                                });
                            }
                            if (!ConsentEngine.debugValues.skipHideMethod) {
                                if (!ConsentEngine.debugValues.dontHideProgressDialog) {
                                    self.currentCMP = null;
                                    self.hideProgressDialog();
                                    cmp.stopObservers();
                                    cmp.unHideAll();
                                }
                            }
                            clearTimeout(self.stopEngineId);
                            clearInterval(self.domScannerIntervalID);

                            self.checkRunning = false;

                            // Remove focus from anything inside the closed popups
                            window.focus();
                            if (document.activeElement) document.activeElement.blur();
                            document.body.focus();
                        }
                    }, 0);
                } else {
                    if (numberOfTries > 0) {
                        numberOfTries--;
                        setTimeout(checkIsShowing, 250);
                    } else {
                        if (ConsentEngine.debugValues.debugLog) {
                            console.groupEnd();
                            console.log(cmp.name + " - Not showing");
                        }
                        self.checkRunning = false;
                        self.startObserver();
                        self.startStopTimeout()
                        self.handleMutations([]);
                    }
                }
            }

            await checkIsShowing();
        } else {
            self.checkRunning = false;
            // Consent-O-Manual: no rule matched, so look for a banner the cookie filter list knows about
            if (ConsentEngine.filterListDetector != null && !self.filterListDone) {
                await self.checkFilterList();
            }
        }
    }

    /**
     * Consent-O-Manual: which one-click answers the site's own banner shows right now.
     * Looks for visible Accept / Reject buttons inside the elements the rule's detector matched.
     * Returns {accept: bool, reject: bool}.
     */
    findOneClickButtons(cmp) {
        const result = {accept: false, reject: false};
        try {
            const detector = cmp.detectors.find((d)=>d.detect());
            if (detector == null) return result;
            const roots = new Set();
            [...detector.showingMatchers, ...detector.presentMatchers].forEach((matcher)=>{
                if (matcher.config == null || matcher.config.type !== "css") return;
                const found = Tools.find(matcher.config);
                [found.target, found.parent].forEach((el)=>{
                    if (el != null && el !== document.body && el !== document.documentElement) roots.add(el);
                });
            });
            roots.forEach((root)=>{
                const buttons = findButtons(root);
                if (buttons.accept != null) result.accept = true;
                if (buttons.reject != null) result.reject = true;
            });
        } catch (e) {
            if (ConsentEngine.debugValues.debugLog) {
                console.warn("Could not look for one-click buttons:", e);
            }
        }
        return result;
    }

    /**
     * Consent-O-Manual: handle a cookie banner found with the cookie-notice filter list.
     * The match must stay visible for a second with no rule matching, so rules always win.
     */
    async checkFilterList() {
        const found = ConsentEngine.filterListDetector.scan();
        if (found == null) {
            this.filterListCandidate = null;
            return;
        }
        if (this.filterListCandidate == null || this.filterListCandidate.element !== found.element) {
            this.filterListCandidate = {element: found.element, since: Date.now()};
            // Keep the engine running long enough to act on it
            this.startStopTimeout();
            return;
        }
        if (Date.now() - this.filterListCandidate.since < 1000) return;

        if (ConsentEngine.debugValues.debugLog) {
            console.log("Cookie banner found with the filter list:", found.selector, found.element);
        }

        this.filterListDone = true;
        this.checkRunning = true;
        this.stopObserver();
        clearTimeout(this.stopEngineId);
        clearInterval(this.domScannerIntervalID);

        let result = null;
        try {
            result = await answerFilterListBanner(found.element, ConsentEngine.decisionProvider);
        } catch (e) {
            console.error("Consent-O-Manual: could not answer banner from the filter list:", e);
            this.checkRunning = false;
            this.handledCallback({handled: false, error: true});
            return;
        }
        this.checkRunning = false;

        if (result == null) {
            this.handledCallback({handled: false, dismissed: true});
        } else {
            this.handledCallback({
                handled: true,
                cmpName: "Cookie filter list",
                clicks: result.clicks,
                oneClick: result.oneClick,
                action: {mode: result.mode}
            });
        }
    }

    unHideAll() {
        if (this.currentCMP != null) {
            this.currentCMP.stopObservers();
            this.currentCMP.unHideAll();
        }
    }

    showProgressDialog(text) {
        const self = this;

        if (ConsentEngine.debugValues.debugLog) {
            console.log("Showing progress...");
        }
        if (this.dialogTimeoutId != null) {
            clearTimeout(this.dialogTimeoutId);
            this.dialogTimeoutId = null;
            if (this.dialog != null) {
                this.dialog.remove();
                this.dialog = null;
            }
            if (this.modal != null) {
                this.modal.remove();
                this.modal = null;
            }
        }

        this.modal = document.createElement("div");
        this.modal.classList.add("ConsentOMatic-Progress-Dialog-Modal");
        this.dialog = document.createElement("div");
        this.dialog.classList.add("ConsentOMatic-Progress-Dialog");

        this.preview = document.createElement("div");
        this.preview.classList.add("ConsentOMatic-Progres-Preview");
        this.modal.appendChild(this.preview);

        let contents = document.createElement("p");
        contents.innerText = text;
        this.dialog.appendChild(contents);
        document.body.appendChild(this.modal);
        this.modal.appendChild(this.dialog);

        this.dialog.addEventListener("click", () => {
            self.unHideAll();
        });

        setTimeout(() => {
            this.modal.classList.add("ConsentOMatic-Progress-Started");
        }, 0);
    }

    calculateProgress() {
        let fraction = (this.completedSteps + this.currentMethodStepsTotal * this.currentMethodFraction) / this.totalSteps;
        this.updateProgress(fraction);
    }

    updateProgress(fraction) {
        if (this.modal != null) {
            this.modal.style.setProperty("--progress", fraction);
        }
    }

    hideProgressDialog() {
        let self = this;
        if (ConsentEngine.debugValues.debugLog) {
            console.log("Hiding progress...");
        }
        this.modal.classList.add("ConsentOMatic-Progress-Complete");
        this.dialogTimeoutId = setTimeout(() => {
            self.modal.remove();
            self.dialog.remove();
            self.dialog = null;
        }, 1000);
        ConsentEngine.enforceScrollBehaviours(false);
    }

    setupObserver() {
        let self = this;

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });
    }

    startObserver() {
        if (document.body != null) {
            this.observer.observe(document.body, {
                childList: true,
                attributes: true,
                subtree: true
            });
        }
    }

    stopObserver() {
        this.observer.disconnect();
    }

    findCMP() {
        return this.cmps.filter((cmp) => {
            return cmp.detect();
        });
    }
}

ConsentEngine.singleton = null;

/**
 * Optional async function(cmpName) => consentValues|null, set by the content script.
 * Returning null means "do nothing on this page".
 */
ConsentEngine.decisionProvider = null;

/**
 * Optional FilterListDetector (set by the content script in the top frame) used when no rule matches.
 */
ConsentEngine.filterListDetector = null;