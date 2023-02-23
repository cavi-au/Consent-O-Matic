class Matcher {
    static createMatcher(config) {
        switch(config.type) {
            case "css": return new CssMatcher(config);
            case "checkbox": return new CheckboxMatcher(config);
            case "url": return new URLMatcher(config);
            case "onoff": return new OnOffMatcher(config);
            default: {
                throw new Error("Unknown matcher type: "+config.type);
            }
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

class OnOffMatcher extends Matcher {
    constructor(config) {
        super(config);
    }

    matches() {
        if(this.config.onMatcher == null || this.config.offMatcher == null) {
            throw new Error("Missing onMatcher/offMatcher on OnOffMatcher: "+JSON.stringify(this.config));
        }

        let onResult = Tools.find(this.config.onMatcher);
        let offResult = Tools.find(this.config.offMatcher);

        if(onResult.target == null && offResult.target == null) {
            throw new Error("Did not find neither on or off targets: "+JSON.stringify(this.config));
        }

        if(onResult.target != null && offResult.target != null) {
            throw new Error("Found both on and off targets: "+JSON.stringify(this.config));
        }

        return onResult.target != null;
    }

    async debug(shouldMatch) {
        let onResult = Tools.find(this.config.onMatcher);
        let offResult = Tools.find(this.config.offMatcher);

        let blinker = [];

        if(onResult.target == null && offResult.target == null) {
            //Neither On nor Off was found, this is wrong, but we have nothing to highlight.
            return;
        }

        if(onResult.target != null && offResult.target != null) {
            //Both On and Off was found, this is wrong!
            blinker.push({target: onResult.target, currect: false});
            blinker.push({target: offResult.target, currect: false});
        } else {
            //Since not both was null, and not both was not null, excactly 1 is not null

            if(shouldMatch) {
                if(onResult.target != null) {
                    blinker.push({target: onResult.target, correct: true});
                } else {
                    blinker.push({target: offResult.target, correct: false});
                }
            } else {
                if(onResult.target != null) {
                    blinker.push({target: onResult.target, correct: false});
                } else {
                    blinker.push({target: offResult.target, correct: true});
                }
            }
        }

        for(let result of blinker) {
            if(result.correct) {
                result.target.style.setProperty("border", "2px solid lime", "important");
                result.target.style.setProperty("background-color", "lime", "important");
            } else {
                result.target.style.setProperty("border", "2px solid pink", "important");
                result.target.style.setProperty("background-color", "pink", "important");
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
        
        if(result.target == null) {
            //No checkbox found, error
            throw new Error("No checkbox found, cannot check state");
        }

        if(this.config.negated) {
            return !result.target.checked;
        }

        return result.target.checked;
    }
}

class URLMatcher extends Matcher {
    constructor(config) {
        super(config);
    }

    debug() {
        //Overriden to disable
    }

    matches() {
        if (ConsentEngine.debugValues.debugLog) {
            console.log("URL Matcher:", ConsentEngine.topFrameUrl, this.config);
        }

        let urls = this.config.url;
        if(!Array.isArray(urls)) {
            urls = [urls];
        }

        let matched = false;
        
        if(this.config.regexp) {
            for(let url of urls) {
                let regexp = new RegExp(url);
                if(regexp.exec(ConsentEngine.topFrameUrl) !== null) {
                    if (ConsentEngine.debugValues.debugLog) {
                        console.log("Matched URL regexp:", url);
                    }
                    matched = true;
                    break;
                }
            }
        } else {
            for(let url of urls) {
                if(ConsentEngine.topFrameUrl.indexOf(url) > -1) {
                    if (ConsentEngine.debugValues.debugLog) {
                        console.log("Matched URL:", url);
                    }
                    matched = true;
                    break;
                }
            }
        }

        if(this.config.negated) {
            //If the matcher should be negated, negate matched
            matched = !matched;
        }

        if (ConsentEngine.debugValues.debugLog) {
            console.log("Did URLMatcher match (after negate):", matched);
        }

        return matched;
    }
}
