class JsonParser {
    static async parseCmp(json) {
        let result = await loadTemplate("cmp");

        for(let detector of json.detectors) {
            let detectorDom = await JsonParser.parseDetector(detector);
            result.querySelector("[data-plug='detector']").appendChild(detectorDom);
        }

        for(let method of json.methods) {
            let methodDom = await JsonParser.parseMethod(method);
            result.querySelector("[data-plug='method']").appendChild(methodDom);
        }

        return result;
    }

    static async parseMethod(json) {
        let result = await loadTemplate("method");

        result.querySelector(":scope > [data-bind='name']").textContent = json.name;

        if(json.action != null) {
            let actionDom = await JsonParser.parseAction(json.action);
            result.querySelector(":scope > [data-bind='action']").appendChild(actionDom);
        }

        return result;
    }

    static async parseDetector(json) {
        let result = await loadTemplate("detector");

        if(json.presentMatcher != null) {
            let presentMatcherDom = await JsonParser.parseMatcher(json.presentMatcher);
            result.querySelector(":scope > [data-bind='presentMatcher']").appendChild(presentMatcherDom);
        }
        if(json.showingMatcher != null) {
            let showingMatcherDom = await JsonParser.parseMatcher(json.showingMatcher);
            result.querySelector(":scope > [data-bind='showingMatcher']").appendChild(showingMatcherDom);
        }

        return result;
    }

    static async parseMatcher(json) {
        let result = await loadTemplate("matcher_"+json.type);

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        return result;
    }

    static async parseDomSelection(json) {
        let result = await loadTemplate("domSelector");

        async function setupDomSelector(dom, json) {
            if(json.selector) {
                dom.querySelector("[data-bind='selector'] input").value = json.selector;
            }
            if(json.textFilter) {
                let text = json.textFilter;
                if(json.textFilter instanceof Array) {
                    text = json.textFilter.join("|");
                }
                dom.querySelector("[data-bind='textFilter'] input").value = text;
            }
            if(json.iframeFilter) {
                dom.querySelector("[data-bind='iframeFilter'] input").checked = json.iframeFilter;
            }
            if(json.displayFilter) {
                dom.querySelector("[data-bind='displayFilter'] input").checked = json.displayFilter;
            }
            if(json.childFilter) {
                let childFilterDom = await JsonParser.parseDomSelection(json.childFilter);
                dom.querySelector(":scope > [data-bind='childFilter']").appendChild(childFilterDom);
            }
        }

        if(json.target) {
            await setupDomSelector(result.querySelector(":scope > .target"), json.target);
            result.querySelector(":scope > .target").classList.remove("toggled");
        }

        if(json.parent) {
            await setupDomSelector(result.querySelector(":scope > .parent"), json.parent);
            result.querySelector(":scope > .parent").classList.remove("toggled");
        }

        return result;
    }

    static async parseAction(json) {
        switch(json.type) {
            case "list":
                return await JsonParser.parseListAction(json);
            case "click":
                return await JsonParser.parseClickAction(json);
            case "consent":
                return await JsonParser.parseConsentAction(json);
            case "foreach":
                return await JsonParser.parseForEachAction(json);
            case "ifcss":
                    return await JsonParser.parseIfCssAction(json);
            case "waitcss":
                return await JsonParser.parseWaitCssAction(json);
            case "slide":
                return await JsonParser.parseSlideAction(json);
            case "close":
                return await JsonParser.parseCloseAction(json);
            case "hide":
                return await JsonParser.parseHideAction(json);
            case "wait":
                return await JsonParser.parseWaitAction(json);
            default:
                console.log("Unknown action type:", json.type);
        }

        return document.createElement("div");
    }

    static async parseListAction(json) {
        let result = await loadTemplate("action_list");

        for(let action of json.actions) {
            let actionDom = await JsonParser.parseAction(action);

            result.querySelector(":scope > [data-bind='actions']").appendChild(actionDom);
        }

        return result;
    }

    static async parseCloseAction(json) {
        let result = await loadTemplate("action_close");

        return result;
    }

    static async parseClickAction(json) {
        let result = await loadTemplate("action_click");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        if(json.openInTab) {
            result.querySelector("[data-bind='openInTab'] input").checked = json.openInTab;
        }

        return result;
    }

    static async parseHideAction(json) {
        let result = await loadTemplate("action_hide");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        return result;
    }

    static async parseSlideAction(json) {
        let result = await loadTemplate("action_slide");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-bind='target']").appendChild(domSelectorDom);

        let dragTargetDom = await JsonParser.parseDomSelection(json.dragTarget);
        result.querySelector(":scope > [data-bind='dragTarget']").appendChild(dragTargetDom);

        result.querySelector("[data-bind='axis']").value = json.axis;

        return result;
    }

    static async parseWaitCssAction(json) {
        let result = await loadTemplate("action_waitcss");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        if(json.retries) {
            result.querySelector("[data-bind='retries'] input").value = json.retries;
        }

        if(json.waitTime) {
            result.querySelector("[data-bind='waitTime'] input").value = json.waitTime;
        }

        if(json.negated) {
            result.querySelector("[data-bind='negated'] input").checked = json.negated;
        }

        return result;
    }

    static async parseWaitAction(json) {
        let result = await loadTemplate("action_wait");

        if(json.waitTime) {
            result.querySelector("[data-bind='waitTime'] input").value = json.waitTime;
        }
        
        return result;
    }

    static async parseConsentAction(json) {
        let result = await loadTemplate("action_consent");

        for(let consent of json.consents) {
            let consentDom = await JsonParser.parseConsent(consent);

            result.querySelector(":scope > [data-bind='consents']").appendChild(consentDom);
        }

        return result;
    }

    static async parseConsent(json) {
        let result = await loadTemplate("consent");

        result.querySelector("[data-bind='type']").value = json.type;

        if(json.matcher) {
            let matcherDom = await JsonParser.parseMatcher(json.matcher);
            result.querySelector(":scope > [data-bind='matcher']").appendChild(matcherDom);
        }

        if(json.toggleAction) {
            let toggleActionDom = await JsonParser.parseAction(json.toggleAction);
            result.querySelector(":scope > [data-bind='toggleAction']").appendChild(toggleActionDom);
        }
        if(json.trueAction) {
            let trueActionDom = await JsonParser.parseAction(json.trueAction);
            result.querySelector(":scope > [data-bind='trueAction']").appendChild(trueActionDom);
        }
        if(json.falseAction) {
            let falseActionDom = await JsonParser.parseAction(json.falseAction);
            result.querySelector(":scope > [data-bind='falseAction']").appendChild(falseActionDom);
        }

        return result;
    }

    static async parseForEachAction(json) {
        let result = await loadTemplate("action_foreach");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        let actionDom = await JsonParser.parseAction(json.action);
        result.querySelector(":scope > [data-bind='action']").appendChild(actionDom);

        return result;
    }

    static async parseIfCssAction(json) {
        let result = await loadTemplate("action_ifcss");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.querySelector(":scope > [data-plug='domSelector']").appendChild(domSelectorDom);

        if(json.trueAction) {
            let trueActionDom = await JsonParser.parseAction(json.trueAction);
            result.querySelector(":scope > [data-bind='trueAction']").appendChild(trueActionDom);
        }
        if(json.falseAction) {
            let falseActionDom = await JsonParser.parseAction(json.falseAction);
            result.querySelector(":scope > [data-bind='falseAction']").appendChild(falseActionDom);
        }

        return result;
    }
}