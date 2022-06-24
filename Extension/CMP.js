class CMP {
    constructor(name, config) {
        let self = this;

        this.name = name;

        this.detectors = [];
        config.detectors.forEach((detectorConfig)=>{
            self.detectors.push(new Detector(detectorConfig));
        });

        this.methods = new Map();
        config.methods.forEach((methodConfig)=>{
            if(methodConfig.action != null) {
                let action = Action.createAction(methodConfig.action, this);
                self.methods.set(methodConfig.name, action);
            }
        });

        this.hiddenTargets = [];
        this.observers = [];
    }

    stopObservers() {
        this.observers.forEach((observer)=>{
            observer.disconnect();
        });
    }

    unHideAll() {
        let ourStyles = [
            "position",
            "left",
            "top",
            "right",
            "bottom",
            "transform",
            "transform-origin",
            "transition",
            "contain",
            "border",
            "box-shadow",
            "z-index",
            "animation"
        ];

        this.hiddenTargets.forEach((target)=>{
            target.classList.remove("ConsentOMatic-CMP-Hider");
            target.classList.remove("ConsentOMatic-CMP-PIP");

            //Find styles we have not set
            let styleAttrSplit = target.getAttribute("style").split(";").filter((style)=>{return style.trim().length > 0});

            let notOurStyles = [];

            styleAttrSplit.forEach((style)=>{
                let styleSplit = style.split(":");
                let name = styleSplit[0].trim();
                let value = styleSplit[1].trim();

                if(!ourStyles.includes(name)) {
                    notOurStyles.push({name, value});
                }
            });

            //Reload saved styles
            if(typeof target.savedStyles !== "undefined") {
                if(target.savedStyles === null) {
                    target.removeAttribute("style");
                }
                target.setAttribute("style", target.savedStyles);
            }

            //Set styles again, we did not set
            notOurStyles.forEach(({name, value})=>{
                target.style.setProperty(name, value);
            });
        });
    }

    detect() {
        if(ConsentEngine.debugValues.debugLog) {
            console.groupCollapsed("Testing:", this.name);
        }
        try {
            let detector = this.detectors.find((detector)=>{
                return detector.detect();
            });

            if(detector != null && ConsentEngine.debugValues.debugLog) {
                console.log("Triggered detector: ", detector);
            }

            if(ConsentEngine.debugValues.debugLog) {
                console.groupEnd();
            }
    
            return detector != null;
        } catch(e) {
            if(ConsentEngine.debugValues.debugLog) {
                console.warn(e);
                console.groupEnd();
            }
        }

        return false;
    }

    isShowing() {
        let detector = this.detectors.find((detector)=>{
            return detector.detect();
        });

        return detector.isShowing();
    }

    isUtility() {
        return this.methods.has("UTILITY") && this.methods.size === 1;
    }

    async runMethod(name, param = null) {
        let action = this.methods.get(name);

        if(action != null) {
            if(ConsentEngine.debugValues.debugLog) {
                console.log("Triggering method: ", name);
            }
            await action.execute(param);
        } else {
            //Make no method behave as if an action was called, IE. push os back on the task stack
            await new Promise((resolve)=>{
                setTimeout(()=>{
                    resolve();
                }, 0);
            });
        }
    }

    getNumStepsForMethod(method) {
        let action = this.methods.get(method);

        if(action != null) {
            return action.getNumSteps();
        }

        return 0;
    }

    getNumSteps() {
        let totalSteps = 0;

        this.methods.forEach((action, name)=>{
            if(name !== "UTILITY") {
                let steps = action.getNumSteps();

                if(name === "HIDE_CMP") {
                    //Hide CMP is called twice
                    totalSteps += (2 * steps);
                } else {
                    totalSteps += steps;
                }
            }
        });

        return totalSteps;
    }
}
