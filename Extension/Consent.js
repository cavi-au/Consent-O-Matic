class Consent {
    constructor(config, cmp) {
        this.config = config;
        this.cmp = cmp;

        if(this.config.toggleAction != null) {
            this.toggleAction = Action.createAction(this.config.toggleAction, cmp);
        }

        if(this.config.matcher != null) {
            this.enabledMatcher = Matcher.createMatcher(this.config.matcher);
        }

        if(this.config.falseAction != null) {
            this.falseAction = Action.createAction(this.config.falseAction, cmp);
        }

        if(this.config.trueAction != null) {
            this.trueAction = Action.createAction(this.config.trueAction, cmp);
        }
    }

    async toggle() {
        return await this.toggleAction.execute();
    }

    isEnabled() {
        return this.enabledMatcher.matches();
    }

    async setEnabled(enabled) {
        if(this.toggleAction != null) {
            if(this.enabledMatcher == null) {
                //Toggle is only supported with a matcher
                if (ConsentEngine.debugValues.debugLog) {
                    throw new Error("Toggle consent action, without a matcher: "+JSON.stringify(this.config));
                }
                return;
            }
            try {
                if(this.isEnabled() !== enabled) {
                    await this.toggle();
                }
            } catch(e) {
                if (ConsentEngine.debugValues.debugLog) {
                    console.error("Error toggling:", e, this.config);
                }
            }
        } else {
            let handled = false;

            //If we have OnOffMatcher, we can reduce clicks to only happen when state is wrong
            if(this.enabledMatcher != null && this.enabledMatcher instanceof OnOffMatcher) {
                try {
                    if(this.isEnabled() && !enabled) {
                        await this.falseAction.execute();
                    } else if(!this.isEnabled() && enabled) {
                        await this.trueAction.execute();
                    }
                    handled = true;
                } catch(e) {
                    if (ConsentEngine.debugValues.debugLog) {
                        console.error("Error pushing on/off:", e, this.config);
                    }
                }
            }

            if(!handled) {
                if(enabled) {
                    await this.trueAction.execute();
                } else {
                    await this.falseAction.execute();
                }
            }
        }

        if (ConsentEngine.debugValues.paintMatchers) {
            if(this.enabledMatcher != null) {
                //Debug if state is correct
                await this.enabledMatcher.debug(enabled);
            }
        }
    }

    get type() {
        return this.config.type;
    }
}
