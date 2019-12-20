class ConsentEngine {
    constructor(config, consentTypes, debugValues) {
        let self = this;

        ConsentEngine.debugValues = debugValues;

        this.consentTypes = consentTypes;

        this.cmps = [];

        Object.keys(config).forEach((key) => {
            try {
                self.cmps.push(new CMP(key, config[key]));
            } catch (err) {
                console.groupCollapsed("Invalid CMP (" + key + ") detected, please update GDPR consent engine or fix the rule generating this error:");
                console.error(err);
                console.groupEnd();
            }
        });

        this.setupObserver();
        this.startObserver();

        this.handleMutations([]);
    }

    async handleMutations(mutations) {
        let self = this;

        let cmps = this.findCMP();

        if (cmps.length > 0) {
            this.stopObserver();

            if (cmps.length > 1) {
                console.warn("Found multiple CMPS's maybee rewise detection rules...", cmps);
            }

            let cmp = cmps[0];

            console.log("CMP Detected: ", cmp.name);

            //Check if popup shows, then do consent stuff
            let numberOfTries = 10;
            async function checkIsShowing() {
                if (cmp.isShowing()) {
                    setTimeout(async () => {
                        await cmp.runMethod("OPEN_OPTIONS");
                        await cmp.runMethod("DO_CONSENT", self.consentTypes);
                        if (!ConsentEngine.debugValues.skipSubmit) {
                            await cmp.runMethod("SAVE_CONSENT");
                        }
                    }, 0);
                } else {
                    if (numberOfTries > 0) {
                        numberOfTries--;
                        setTimeout(checkIsShowing, 250);
                    } else {
                        console.log("Not showing...", cmp.name);
                    }
                }
            }

            checkIsShowing();
        }
    }

    setupObserver() {
        let self = this;

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });
    }

    startObserver() {
        this.observer.observe(document.body, {
            childList: true,
            attributes: true,
            subtree: true
        });
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
