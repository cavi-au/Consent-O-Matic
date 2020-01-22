async function loadTemplate(id) {
    let response = await fetch("./templates.html");
    let text = await response.text();

    let parser = new DOMParser();
    let dom = parser.parseFromString(text, "text/html");

    return cQuery(document.importNode(cQuery(dom).find("#"+id)[0].content, true)).children();
}

class JsonParser {
    static async parseCmp(json) {
        let result = await loadTemplate("cmp");

        for(let detector of json.detectors) {
            let detectorDom = await JsonParser.parseDetector(detector);
            result.find("[data-plug='detector']").append(detectorDom);
        }

        for(let method of json.methods) {
            let methodDom = await JsonParser.parseMethod(method);
            result.find("[data-plug='method']").append(methodDom);
        }

        return result;
    }

    static async parseMethod(json) {
        let result = await loadTemplate("method");

        result.children("[data-bind='name']")[0].textContent = json.name;

        if(json.action != null) {
            let actionDom = await JsonParser.parseAction(json.action);
            result.children("[data-bind='action']").append(actionDom);
        }

        return result;
    }

    static async parseDetector(json) {
        let result = await loadTemplate("detector");

        if(json.presentMatcher != null) {
            let presentMatcherDom = await JsonParser.parseMatcher(json.presentMatcher);
            result.children("[data-bind='presentMatcher']").append(presentMatcherDom);
        }
        if(json.showingMatcher != null) {
            let showingMatcherDom = await JsonParser.parseMatcher(json.showingMatcher);
            result.children("[data-bind='showingMatcher']").append(showingMatcherDom);
        }

        return result;
    }

    static async parseMatcher(json) {
        let result = await loadTemplate("matcher_"+json.type);

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        return result;
    }

    static async parseDomSelection(json) {
        let result = await loadTemplate("domSelector");

        async function setupDomSelector(dom, json) {
            if(json.selector) {
                dom.find("[data-bind='selector'] input")[0].value = json.selector;
            }
            if(json.textFilter) {
                let text = json.textFilter;
                if(json.textFilter instanceof Array) {
                    text = json.textFilter.join("|");
                }
                dom.find("[data-bind='textFilter'] input")[0].value = text;
            }
            if(json.iframeFilter) {
                dom.find("[data-bind='iframeFilter'] input")[0].checked = json.iframeFilter;
            }
            if(json.displayFilter) {
                dom.find("[data-bind='displayFilter'] input")[0].checked = json.displayFilter;
            }
            if(json.childFilter) {
                let childFilterDom = await JsonParser.parseDomSelection(json.childFilter);
                dom.children("[data-bind='childFilter']").append(childFilterDom);
            }
        }

        if(json.target) {
            await setupDomSelector(result.children(".target"), json.target);
            result.children(".target").removeClass("toggled");
        }

        if(json.parent) {
            await setupDomSelector(result.children(".parent"), json.parent);
            result.children(".parent").removeClass("toggled");
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

        return cQuery("<div></div>");
    }

    static async parseListAction(json) {
        let result = await loadTemplate("action_list");

        for(let action of json.actions) {
            let actionDom = await JsonParser.parseAction(action);

            result.children("[data-bind='actions']").append(actionDom);
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
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        if(json.openInTab) {
            result.find("[data-bind='openInTab'] input")[0].checked = json.openInTab;
        }

        return result;
    }

    static async parseHideAction(json) {
        let result = await loadTemplate("action_hide");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        return result;
    }

    static async parseSlideAction(json) {
        let result = await loadTemplate("action_slide");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-bind='target']").append(domSelectorDom);

        let dragTargetDom = await JsonParser.parseDomSelection(json.dragTarget);
        result.children("[data-bind='dragTarget']").append(dragTargetDom);

        result.find("[data-bind='axis']")[0].value = json.axis;

        return result;
    }

    static async parseWaitCssAction(json) {
        let result = await loadTemplate("action_waitcss");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        if(json.retries) {
            result.find("[data-bind='retries'] input")[0].value = json.retries;
        }

        if(json.waitTime) {
            result.find("[data-bind='waitTime'] input")[0].value = json.waitTime;
        }

        if(json.negated) {
            result.find("[data-bind='negated'] input")[0].checked = json.negated;
        }

        return result;
    }

    static async parseWaitAction(json) {
        let result = await loadTemplate("action_wait");

        if(json.waitTime) {
            result.find("[data-bind='waitTime'] input")[0].value = json.waitTime;
        }
        
        return result;
    }

    static async parseConsentAction(json) {
        let result = await loadTemplate("action_consent");

        for(let consent of json.consents) {
            let consentDom = await JsonParser.parseConsent(consent);

            result.children("[data-bind='consents']").append(consentDom);
        }

        return result;
    }

    static async parseConsent(json) {
        let result = await loadTemplate("consent");

        result.find("[data-bind='type']")[0].value = json.type;

        if(json.matcher) {
            let matcherDom = await JsonParser.parseMatcher(json.matcher);
            result.children("[data-bind='matcher']").append(matcherDom);
        }

        if(json.toggleAction) {
            let toggleActionDom = await JsonParser.parseAction(json.toggleAction);
            result.children("[data-bind='toggleAction']").append(toggleActionDom);
        }
        if(json.trueAction) {
            let trueActionDom = await JsonParser.parseAction(json.trueAction);
            result.children("[data-bind='trueAction']").append(trueActionDom);
        }
        if(json.falseAction) {
            let falseActionDom = await JsonParser.parseAction(json.falseAction);
            result.children("[data-bind='falseAction']").append(falseActionDom);
        }

        return result;
    }

    static async parseForEachAction(json) {
        let result = await loadTemplate("action_foreach");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        let actionDom = await JsonParser.parseAction(json.action);
        result.children("[data-bind='action']").append(actionDom);

        return result;
    }

    static async parseIfCssAction(json) {
        let result = await loadTemplate("action_ifcss");

        let domSelectorDom = await JsonParser.parseDomSelection(json);
        result.children("[data-plug='domSelector']").append(domSelectorDom);

        if(json.trueAction) {
            let trueActionDom = await JsonParser.parseAction(json.trueAction);
            result.children("[data-bind='trueAction']").append(trueActionDom);
        }
        if(json.falseAction) {
            let falseActionDom = await JsonParser.parseAction(json.falseAction);
            result.children("[data-bind='falseAction']").append(falseActionDom);
        }

        return result;
    }
}