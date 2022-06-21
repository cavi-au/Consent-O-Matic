class ConsentEngine {
    constructor(config, consentTypes, handledCallback) {
        let self = this;

        this.consentTypes = consentTypes;

        this.cmps = [];

        this.handledCallback = handledCallback;

        this.triedCMPs = new Set();

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

        this.handleMutations([]);

        this.startStopTimeout();
    }

    startStopTimeout() {
        if (this.stopEngineId != null) {
            clearTimeout(this.stopEngineId);
        }

        this.stopEngineId = setTimeout(() => {
            if (ConsentEngine.debugValues.debugLog) {
                console.log("No CMP detected in 5 seconds, stopping engine...");
            }
            this.stopObserver();
        }, 5000);
    }

    async handleMutations(mutations) {
        const self = this;

        if (this.queueId == null) {
            this.queueId = setTimeout(() => {
                try {
                    self.checkForCMPs();
                } catch (e) {
                    console.error(e);
                }
                self.queueId = null;
            }, 250);
        }
    }

    checkForCMPs() {
        const self = this;

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
            let numberOfTries = 10;
            async function checkIsShowing() {
                if (cmp.isShowing()) {
                    if (ConsentEngine.debugValues.debugLog) {
                        console.groupEnd();
                        console.log(cmp.name + " - Showing");
                    }
                    setTimeout(async () => {
                        if (cmp.isUtility()) {
                            if (ConsentEngine.debugValues.debugLog) {
                                console.groupCollapsed(cmp.name + " - UTILITY");
                            }
                            await cmp.runMethod("UTILITY");
                            if (ConsentEngine.debugValues.debugLog) {
                                console.groupEnd();
                            }
                            self.startObserver();
                            self.handleMutations([]);
                        } else {
                            try {
                                let clicks = 0;

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    self.showProgressDialog("Autofilling " + cmp.name + ", please wait...");
                                }

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - HIDE_CMP");
                                    }
                                    await cmp.runMethod("HIDE_CMP");
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }

                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupCollapsed(cmp.name + " - OPEN_OPTIONS");
                                }
                                clicks += await cmp.runMethod("OPEN_OPTIONS");
                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupEnd();
                                }

                                if (!ConsentEngine.debugValues.skipHideMethod) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - HIDE_CMP");
                                    }
                                    await cmp.runMethod("HIDE_CMP");
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }

                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupCollapsed(cmp.name + " - DO_CONSENT");
                                }
                                clicks += await cmp.runMethod("DO_CONSENT", self.consentTypes);
                                if (ConsentEngine.debugValues.debugLog) {
                                    console.groupEnd();
                                }

                                if (!ConsentEngine.debugValues.skipSubmit) {
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupCollapsed(cmp.name + " - SAVE_CONSENT");
                                    }
                                    clicks += await cmp.runMethod("SAVE_CONSENT");
                                    if (ConsentEngine.debugValues.debugLog) {
                                        console.groupEnd();
                                    }
                                }
                                if (!(clicks > 0)) {
                                    clicks = 0; // Catch-all for NaN, negative numbers etc.
                                    if(ConsentEngine.debugValues.debugLog) {
                                        console.log("Consent-O-Matic click count was 0 for CMP:", cmp.name);
                                    }
                                }
                                self.handledCallback({
                                    cmpName: cmp.name,
                                    clicks: clicks
                                });
                            } catch (e) {
                                console.log("Error during consent handling:", e);
                            }
                            if (!ConsentEngine.debugValues.skipHideMethod) {
                                cmp.unHideAll();
                                self.hideProgressDialog();
                            }
                            clearTimeout(self.stopEngineId);
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
                        self.startObserver();
                        self.handleMutations([]);
                        self.startStopTimeout()
                    }
                }
            }

            checkIsShowing();
        }
    }

    showProgressDialog(text) {
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
        let header = document.createElement("h1");
        let contents = document.createElement("p");
        header.innerText = "Consent-o-Matic";
        contents.innerText = text;
        this.dialog.appendChild(header);
        this.dialog.appendChild(contents);
        document.body.appendChild(this.modal);
        document.body.appendChild(this.dialog);
        setTimeout(() => {
            this.dialog.classList.add("ConsentOMatic-Progress-Started");
        }, 0);
    }

    hideProgressDialog() {
        let self = this;
        if (ConsentEngine.debugValues.debugLog) {
            console.log("Hiding progress...");
        }
        this.modal.classList.add("ConsentOMatic-Progress-Complete");
        this.dialog.classList.add("ConsentOMatic-Progress-Complete");
        this.dialogTimeoutId = setTimeout(() => {
            self.modal.remove();
            self.dialog.remove();
            self.dialog = null;
        }, 1000);
    }

    setupObserver() {
        let self = this;

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });
    }

    startObserver() {
        if(document.body != null) {
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
