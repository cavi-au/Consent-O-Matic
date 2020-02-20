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
    }

    unHideAll() {
        this.hiddenTargets.forEach((target)=>{
            target.classList.remove("ConsentOMatic-CMP-Hider");
        });
    }

    detect() {
        let detector = this.detectors.find((detector)=>{
            return detector.detect();
        });

        if(detector != null && ConsentEngine.debugValues.debugLog) {
            console.log("Triggered detector: ", detector);
        }

        return detector != null;
    }

    isShowing() {
        let detector = this.detectors.find((detector)=>{
            return detector.detect();
        });

        return detector.isShowing();
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
}
