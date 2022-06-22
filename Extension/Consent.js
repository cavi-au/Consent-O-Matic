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
        if(this.enabledMatcher != null && this.toggleAction != null) {
            if(this.isEnabled() && !enabled) {
                await this.toggle();
            } else if(!this.isEnabled() && enabled) {
                await this.toggle();
            }
        } else {
            if(enabled) {
                await this.trueAction.execute();
            } else {
                await this.falseAction.execute();
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
