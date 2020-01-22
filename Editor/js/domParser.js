class DomParser {
    static async parseCmpDom(dom) {
        dom = cQuery(dom);

        let result = {
            detectors: [],
            methods: []
        };

        for(let detectorDom of dom.find("[data-type='detector']")) {
            let detectorJson = await DomParser.parseDetectorDom(detectorDom);
            result.detectors.push(detectorJson);
        }

        for(let methodDom of dom.find("[data-type='method']")) {
            let methodJson = await DomParser.parseMethodDom(methodDom);
            result.methods.push(methodJson);
        }

        return result;
    }

    static async parseDetectorDom(dom) {
        dom = cQuery(dom);

        let result = {
            presentMatcher: null,
            showingMatcher: null
        };

        let presentMatcherDom = dom.children("[data-bind='presentMatcher']").children("[data-type='matcher']");
        if(presentMatcherDom.length > 0) {
            let matcherJson = await DomParser.parseMatcherDom(presentMatcherDom);
            result.presentMatcher = matcherJson;
        }

        let showingMatcherDom = dom.children("[data-bind='showingMatcher']").children("[data-type='matcher']");
        if(showingMatcherDom.length > 0) {
            let matcherJson = await DomParser.parseMatcherDom(showingMatcherDom);
            result.showingMatcher = matcherJson;
        }

        return result;
    }

    static async parseMatcherDom(dom) {
        dom = cQuery(dom);

        let result = {
            type: dom[0].getAttribute("data-variant")
        };

        let domSelectorDom = dom.children("[data-plug='domSelector']").children("[data-type='domSelector']");
        if(domSelectorDom.length > 0) {
            let domSelectorJson = await DomParser.parseDomSelectorDom(domSelectorDom);
            Object.assign(result, domSelectorJson);
        }

        return result;
    }

    static async parseDomSelectorDom(dom) {
        dom = cQuery(dom);

        let result = {};

        async function parseDomSelector(dom) {
            dom = cQuery(dom);
            let result = {};

            let selectorInput = dom.children("[data-bind='selector']").find("input")[0];
            let textFilterInput = dom.children("[data-bind='textFilter']").find("input")[0];
            let iframeFilterInput = dom.children("[data-bind='iframeFilter']").find("input")[0];
            let displayFilterInput = dom.children("[data-bind='displayFilter']").find("input")[0];
            let childFilter = dom.children("[data-bind='childFilter']").children("[data-type='domSelector']");

            if(selectorInput.value.trim().length > 0) {
                result.selector = selectorInput.value.trim();
            }
            if(textFilterInput.value.trim().length > 0) {
                result.textFilter = textFilterInput.value.split("|").map(s => s.trim()).filter(s => s.length > 0);
            }
            if(iframeFilterInput.checked) {
                result.iframeFilter = iframeFilterInput.checked;
            }
            if(displayFilterInput.checked) {
                result.displayFilter = displayFilterInput.checked;
            }
            if(childFilter.find(".target, .parent").length > 0) {
                result.childFilter = await DomParser.parseDomSelectorDom(childFilter);
            }

            if(Object.keys(result).length === 0) {
                return null;
            }

            return result;
        }

        let parent = await parseDomSelector(dom.children(".parent")[0]);
        let target = await parseDomSelector(dom.children(".target")[0]);

        if(parent != null) {
            result.parent = parent;
        }
        if(target != null) {
            result.target = target;
        }

        return result;
    }

    static async parseMethodDom(dom) {
        dom = cQuery(dom);

        let result = {};

        result.name = dom.children("[data-bind='name']")[0].textContent;

        let actionDom = dom.children("[data-bind='action']").children("[data-type='action']");
        if(actionDom.length > 0) {
            result.action = await DomParser.parseActionDom(actionDom[0]);
        } else {
            result.action = null;
        }

        return result;
    }

    static async parseActionDom(dom) {
        dom = cQuery(dom);

        let result = {};

        if(dom[0].hasAttribute("data-variant")) {
            result.type = dom[0].getAttribute("data-variant");
        } else {
            result.type = dom.find("[data-variant]")[0].getAttribute("data-variant");
        }

        switch(result.type) {
            case "list":
                await DomParser.parseListActionDom(dom, result);
                break; 
            case "click":
                await DomParser.parseClickActionDom(dom, result);
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
        for(let actionDom of cQuery(dom.children("[data-bind='actions']")[0]).children("[data-type='action']")) {
            result.actions.push(await DomParser.parseActionDom(actionDom));
        }
    }

    static async parseClickActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.children("[data-plug='domSelector']").children("[data-type='domSelector']")[0]));
        let openInTabInput = dom.find("[data-bind='openInTab'] input")[0];
        if(openInTabInput.checked) {
            result.openInTab = true;
        }
    }

    static async parseSlideActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.children("[data-bind='target']").children("[data-type='domSelector']")[0]));
        result.dragTarget = await DomParser.parseDomSelectorDom(dom.children("[data-bind='dragTarget']").children("[data-type='domSelector']")[0]);
        let axis = dom.find("[data-bind='axis']")[0];
        result.axis = axis.value;
    }

    static async parseForEachActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.children("[data-plug='domSelector']").children("[data-type='domSelector']")[0]));
        result.action = await DomParser.parseActionDom(dom.children("[data-bind='action']").children("[data-type='action']")[0]);
    }

    static async parseIfCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.children("[data-plug='domSelector']").children("[data-type='domSelector']")[0]));
        let trueActionDom = dom.children("[data-bind='trueAction']").children("[data-type='action']");
        if(trueActionDom.length > 0) {
            result.trueAction = await DomParser.parseActionDom(trueActionDom);
        }

        let falseActionDom = dom.children("[data-bind='falseAction']").children("[data-type='action']");
        if(falseActionDom.length > 0) {
            result.falseAction = await DomParser.parseActionDom(falseActionDom);
        }
    }

    static async parseWaitCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.children("[data-plug='domSelector']").children("[data-type='domSelector']")[0]));
        let retriesInput = dom.children("[data-bind='retries']").find("input")[0];
        let waitTimeInput = dom.children("[data-bind='waitTime']").find("input")[0];
        let negatedInput = dom.children("[data-bind='negated']").find("input")[0];

        result.retries = parseInt(retriesInput.value);
        result.waitTime = parseInt(waitTimeInput.value);
        result.negated = negatedInput.checked;
    }

    static async parseWaitActionDom(dom, result) {
        let waitTimeInput = dom.children("[data-bind='waitTime']").find("input")[0];

        result.waitTime = parseInt(waitTimeInput.value);
    }

    static async parseConsentActionDom(dom, result) {
        result.consents = [];
        //Find first level of consents
        for(let consentDom of cQuery(dom.children("[data-bind='consents']")[0]).children("[data-type='consent']")) {
            result.consents.push(await DomParser.parseConsentDom(consentDom));
        }
    }

    static async parseConsentDom(dom) {
        dom = cQuery(dom);

        let result = {};

        result.type = dom.children(".type").children("[data-bind='type']")[0].value;

        let matcherDom = dom.children("[data-bind='matcher']").children("[data-type='matcher']");
        if(matcherDom.length > 0) {
            result.matcher = await DomParser.parseMatcherDom(matcherDom);
        }

        let toggleActionDom = dom.children("[data-bind='toggleAction']").children("[data-type='action']");
        if(toggleActionDom.length > 0) {
            result.toggleAction = await DomParser.parseActionDom(toggleActionDom);
        }

        let trueActionDom = dom.children("[data-bind='trueAction']").children("[data-type='action']");
        if(trueActionDom.length > 0) {
            result.trueAction = await DomParser.parseActionDom(trueActionDom);
        }

        let falseActionDom = dom.children("[data-bind='falseAction']").children("[data-type='action']");
        if(falseActionDom.length > 0) {
            result.falseAction = await DomParser.parseActionDom(falseActionDom);
        }

        return result;
    }
}