class DomParser {
    static async parseCmpDom(dom) {
        let result = {
            detectors: [],
            methods: []
        };

        for(let detectorDom of Array.from(dom.querySelectorAll("[data-type='detector']"))) {
            let detectorJson = await DomParser.parseDetectorDom(detectorDom);
            result.detectors.push(detectorJson);
        }

        for(let methodDom of Array.from(dom.querySelectorAll("[data-type='method']"))) {
            let methodJson = await DomParser.parseMethodDom(methodDom);
            result.methods.push(methodJson);
        }

        return result;
    }

    static async parseDetectorDom(dom) {
        let result = {
            presentMatcher: null,
            showingMatcher: null
        };

        try {
            let presentMatcherDom = dom.querySelector(":scope > [data-bind='presentMatcher']").querySelector(":scope > [data-type='matcher']");
            if(presentMatcherDom != null) {
                let matcherJson = await DomParser.parseMatcherDom(presentMatcherDom);
                result.presentMatcher = matcherJson;
            }
        } catch(e) {
            console.warn(e);
        }

        try {
            let showingMatcherDom = dom.querySelector(":scope > [data-bind='showingMatcher']").querySelector(":scope > [data-type='matcher']");
            if(showingMatcherDom != null) {
                let matcherJson = await DomParser.parseMatcherDom(showingMatcherDom);
                result.showingMatcher = matcherJson;
            }
        } catch(e) {
            console.warn(e);
        }


        return result;
    }

    static async parseMatcherDom(dom) {
        let result = {
            type: dom.getAttribute("data-variant")
        };

        try {
            let domSelectorDom = dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']");
            if(domSelectorDom != null) {
                let domSelectorJson = await DomParser.parseDomSelectorDom(domSelectorDom);
                Object.assign(result, domSelectorJson);
            }
        } catch(e) {
            console.warn(e);
        }

        return result;
    }

    static async parseDomSelectorDom(dom) {
        let result = {};

        async function parseDomSelector(dom) {
            let result = {};

            try {
                let selectorInput = dom.querySelector(":scope > [data-bind='selector']").querySelector("input");
                if(selectorInput.value.trim().length > 0) {
                    result.selector = selectorInput.value.trim();
                }
            } catch(e) {
                //console.warn(e);
            }

            try {
                let textFilterInput = dom.querySelector(":scope > [data-bind='textFilter']").querySelector("input");
                if(textFilterInput.value.trim().length > 0) {
                    result.textFilter = textFilterInput.value.split("|").map(s => s.trim()).filter(s => s.length > 0);
                }
            } catch(e) {
                //console.warn(e);
            }

            try {
                let iframeFilterInput = dom.querySelector(":scope > [data-bind='iframeFilter']").querySelector("input");
                if(iframeFilterInput.checked) {
                    result.iframeFilter = iframeFilterInput.checked;
                }
            } catch(e) {
                //console.warn(e);
            }

            try {
                let displayFilterInput = dom.querySelector(":scope > [data-bind='displayFilter']").querySelector("input");
                if(displayFilterInput.checked) {
                    result.displayFilter = displayFilterInput.checked;
                }
            } catch(e) {
                //console.warn(e);
            }

            try {
                let childFilter = dom.querySelector(":scope > [data-bind='childFilter']").querySelector(":scope > [data-type='domSelector']");
                if(childFilter.querySelector(".target, .parent") != null) {
                    result.childFilter = await DomParser.parseDomSelectorDom(childFilter);
                }
            } catch(e) {
                //console.warn(e);
            }

            if(Object.keys(result).length === 0) {
                return null;
            }

            return result;
        }

        let parent = await parseDomSelector(dom.querySelector(":scope > .parent"));
        let target = await parseDomSelector(dom.querySelector(":scope > .target"));

        if(parent != null) {
            result.parent = parent;
        }
        if(target != null) {
            result.target = target;
        }

        return result;
    }

    static async parseMethodDom(dom) {
        let result = {};

        result.name = dom.querySelector(":scope > [data-bind='name']").textContent;

        try {
            let actionDom = dom.querySelector(":scope > [data-bind='action']").querySelector(":scope > [data-type='action']");
            if(actionDom != null) {
                result.action = await DomParser.parseActionDom(actionDom);
            } else {
                result.action = null;
            }
        } catch(e) {
            console.warn(e);
            result.action = null;
        }

        return result;
    }

    static async parseActionDom(dom) {
        let result = {};

        if(dom.hasAttribute("data-variant")) {
            result.type = dom.getAttribute("data-variant");
        } else {
            result.type = dom.querySelector("[data-variant]").getAttribute("data-variant");
        }

        switch(result.type) {
            case "list":
                await DomParser.parseListActionDom(dom, result);
                break; 
            case "click":
                await DomParser.parseClickActionDom(dom, result);
                break; 
            case "hide":
                await DomParser.parseHideActionDom(dom, result);
                break; 
            case "foreach":
                await DomParser.parseForEachActionDom(dom, result);
                break; 
            case "consent":
                await DomParser.parseConsentActionDom(dom, result);
                break; 
            case "waitcss":
                await DomParser.parseWaitCssActionDom(dom, result);
                break; 
            case "ifcss":
                await DomParser.parseIfCssActionDom(dom, result);
                break; 
            case "slide":
                await DomParser.parseSlideActionDom(dom, result);
                break; 
            case "wait":
                await DomParser.parseWaitActionDom(dom, result);
                break; 
            case "close":
                //No extra parameters
                break; 
            default:
                console.log("Unknown action type: ", result.type);
                break;
        }

        return result;
    }

    static async parseListActionDom(dom, result) {
        result.actions = [];
        //Find first level of actions (Might be list action somewhere furhter down)
        for(let actionDom of Array.from(dom.querySelector(":scope > [data-bind='actions']").querySelectorAll(":scope > [data-type='action']"))) {
            result.actions.push(await DomParser.parseActionDom(actionDom));
        }
    }

    static async parseClickActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']")));
        let openInTabInput = dom.querySelector("[data-bind='openInTab'] input");
        if(openInTabInput.checked) {
            result.openInTab = true;
        }
    }

    static async parseHideActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']")));
    }

    static async parseSlideActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-bind='target']").querySelector(":scope > [data-type='domSelector']")));
        result.dragTarget = await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-bind='dragTarget']").querySelector(":scope > [data-type='domSelector']"));
        let axis = dom.querySelector("[data-bind='axis']");
        result.axis = axis.value;
    }

    static async parseForEachActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']")));
        result.action = await DomParser.parseActionDom(dom.querySelector(":scope > [data-bind='action']").querySelector(":scope > [data-type='action']"));
    }

    static async parseIfCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']")));
        try {
            let trueActionDom = dom.querySelector(":scope > [data-bind='trueAction']").querySelector(":scope > [data-type='action']");
            if(trueActionDom != null) {
                result.trueAction = await DomParser.parseActionDom(trueActionDom);
            }
        } catch(e) {
            console.warn(e);
        }

        try {
            let falseActionDom = dom.querySelector(":scope > [data-bind='falseAction']").querySelector(":scope > [data-type='action']");
            if(falseActionDom != null) {
                result.falseAction = await DomParser.parseActionDom(falseActionDom);
            }
        } catch(e) {
            console.warn(e);
        }
    }

    static async parseWaitCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.querySelector(":scope > [data-plug='domSelector']").querySelector(":scope > [data-type='domSelector']")));
        let retriesInput = dom.querySelector(":scope > [data-bind='retries']").querySelector("input");
        let waitTimeInput = dom.querySelector(":scope > [data-bind='waitTime']").querySelector("input");
        let negatedInput = dom.querySelector(":scope > [data-bind='negated']").querySelector("input");

        result.retries = parseInt(retriesInput.value);
        result.waitTime = parseInt(waitTimeInput.value);
        result.negated = negatedInput.checked;
    }

    static async parseWaitActionDom(dom, result) {
        let waitTimeInput = dom.querySelector(":scope > [data-bind='waitTime']").querySelector("input");

        result.waitTime = parseInt(waitTimeInput.value);
    }

    static async parseConsentActionDom(dom, result) {
        result.consents = [];
        //Find first level of consents
        console.log(dom);
        for(let consentDom of Array.from(dom.querySelector(":scope > [data-bind='consents']").querySelectorAll(":scope > [data-type='consent']"))) {
            console.log(consentDom);
            result.consents.push(await DomParser.parseConsentDom(consentDom));
        }
    }

    static async parseConsentDom(dom) {
        let result = {};

        result.type = dom.querySelector(":scope > .type").querySelector(":scope > [data-bind='type']").value;

        try {
            let matcherDom = dom.querySelector(":scope > [data-bind='matcher']").querySelector(":scope > [data-type='matcher']");
            if(matcherDom != null) {
                result.matcher = await DomParser.parseMatcherDom(matcherDom);
            }
        }catch(e) {
            //console.warn(e);
        }

        try {
            let toggleActionDom = dom.querySelector(":scope > [data-bind='toggleAction']").querySelector(":scope > [data-type='action']");
            if(toggleActionDom != null) {
                result.toggleAction = await DomParser.parseActionDom(toggleActionDom);
            }
        }catch(e) {
            //console.warn(e);
        }

        try {
            let trueActionDom = dom.querySelector(":scope > [data-bind='trueAction']").querySelector(":scope > [data-type='action']");
            if(trueActionDom != null) {
                result.trueAction = await DomParser.parseActionDom(trueActionDom);
            }
        }catch(e) {
            //console.warn(e);
        }

        try {
            let falseActionDom = dom.children("[data-bind='falseAction']").children("[data-type='action']");
            if(falseActionDom != null) {
                result.falseAction = await DomParser.parseActionDom(falseActionDom);
            }
        }catch(e) {
            //console.warn(e);
        }

        return result;
    }
}