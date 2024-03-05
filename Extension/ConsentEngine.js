class ConsentEngine {
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
                                    clicks: self.numClicks
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