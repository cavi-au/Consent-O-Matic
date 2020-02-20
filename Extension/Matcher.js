class Matcher {
    static createMatcher(config) {
        switch(config.type) {
            case "css": return new CssMatcher(config);
            case "checkbox": return new CheckboxMatcher(config);
            default: throw "Unknown matcher type: "+config.type;
        }
    }

    constructor(config) {
        this.config = config;
    }

    matches() {
        console.log("Remember to override matches()");
    }

    async debug(shouldMatch) {
        let result = Tools.find(this.config);

        let blinker = result.parent || result.target;

        if(blinker != null) {
            if(blinker.matches("input")) {
                blinker = blinker.parentNode;
            }

            let matches = this.matches();
            let correct = shouldMatch === matches;

            if (ConsentEngine.debugValues.clickDelay) {
                blinker.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center"
                });
            }

            if(correct) {
                blinker.style.border = "2px solid lime";
                blinker.style.backgroundColor = "lime";
            } else {
                blinker.style.border = "2px solid pink";
                blinker.style.backgroundColor = "pink";
            }

            await new Promise((resolve, reject)=>{
                if (ConsentEngine.debugValues.clickDelay) {
                        setTimeout(()=>{
                        resolve();
                    }, 10);
                } else {
                    resolve();
                }
            });
        }
    }
}

class CssMatcher extends Matcher {
    constructor(config) {
        super(config);
    }

    matches() {
        let result = Tools.find(this.config);

        return result.target != null;
    }
}

class CheckboxMatcher extends Matcher {
    constructor(config) {
        super(config);
    }

    matches() {
        let result = Tools.find(this.config);
        
        return result.target != null && result.target.checked;
    }
}