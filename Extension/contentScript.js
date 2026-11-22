import GDPRConfig from "./GDPRConfig.js";
import ConsentEngine from "./ConsentEngine.js";
import UnifiedPopup from "./UnifiedPopup.js";
import ActionToast from "./ActionToast.js";
import {FilterListDetector} from "./FilterListCMP.js";

const insideIframe = window !== window.parent;

// What the decision provider decided last ({mode, source}), used for the action notification
let lastAction = null;

/**
 * Shows the unified popup in this (top) frame and returns the user's answer, or null.
 */
async function askUser({host, cmpName, limited}) {
    const [subsetValues, generalSettings] = await Promise.all([
        GDPRConfig.getConsentValues(),
        GDPRConfig.getGeneralSettings()
    ]);
    return UnifiedPopup.show({host, cmpName, subsetValues, limited: limited === true, style: generalSettings.popupStyle});
}

/**
 * Shows the green "action taken" notification in this (top) frame, unless turned off.
 */
async function showActionToast({host, mode, source}) {
    const generalSettings = await GDPRConfig.getGeneralSettings();
    if (generalSettings.showNotifications === false) return;
    ActionToast.show({host, mode, source});
}

function notifyAction(host, action) {
    if (action == null) return;
    const request = {host: host, mode: action.mode, source: action.source};
    if (!insideIframe) {
        showActionToast(request);
    } else {
        // Shown in the top frame, like the popup
        chrome.runtime.sendMessage("ShowToast|" + JSON.stringify(request));
    }
}

/**
 * Consent-O-Manual decision provider used by the engine.
 * Resolves per-site preference -> global default -> unified popup.
 */
function createDecisionProvider(host) {
    // options.limited: the banner can only be answered with Accept all / Reject all (filter-list banners)
    return async (cmpName, options = {})=>{
        const limited = options.limited === true;
        lastAction = null;
        const decision = await GDPRConfig.resolveDecision(host);
        if (ConsentEngine.debugValues.debugLog) {
            console.log("Consent-O-Manual decision for", host, decision);
        }
        if (decision.mode !== "ask") {
            lastAction = {mode: decision.mode, source: decision.source};
            return decision.values;
        }

        let answer;
        if (!insideIframe) {
            answer = await askUser({host, cmpName, limited});
        } else {
            // The CMP lives in an iframe: show the popup in the top frame instead of inside a tiny iframe
            answer = await new Promise((resolve)=>{
                chrome.runtime.sendMessage("AskUser|" + JSON.stringify({host, cmpName, limited}), (response)=>{
                    resolve(response == null ? null : response);
                });
            });
        }

        if (answer == null) {
            return null;
        }

        if (answer.remember) {
            await GDPRConfig.setSitePreference(host, answer);
        }
        lastAction = {mode: answer.mode, source: "asked"};

        const subsetValues = await GDPRConfig.getConsentValues();
        return GDPRConfig.valuesForMode(answer.mode, subsetValues, answer.values);
    };
}

// The top frame hosts the unified popup and the notification for CMPs found in child iframes
if (!insideIframe) {
    chrome.runtime.onMessage.addListener((message, sender, reply)=>{
        if (message != null && message.type === "ShowUnifiedPopup") {
            askUser(message).then(reply, ()=>reply(null));
            return true;
        }
        if (message != null && message.type === "ShowToast") {
            showActionToast(message);
            reply();
            return false;
        }
        return false;
    });
}

async function contentScriptRunner() {
    if (document.contentType!=="text/html") return;

    // Figure out the URL
    let url = location.href;
    if(insideIframe) {
        //We are inside an iframe, request the actual tab url to check if we are active
        url = await new Promise((resolve, reject)=>{
            chrome.runtime.sendMessage("GetTabUrl", (response)=>{
                resolve(response);
            });
        });
    }
    const urlObj = new URL(url);
    url = urlObj.host;

    GDPRConfig.isActive(url).then(async (active) => {
        if (active) {
            chrome.runtime.sendMessage("GetRuleList", (fetchedRules)=>{
                if (!fetchedRules) {
                    console.log("Failed to connect with service worker for getRuleList msg", fetchedRules);
                } else {
                    GDPRConfig.getCustomRuleLists().then((customRules)=>{
                        fetchedRules.forEach((ruleObj)=>{
                            delete ruleObj["$schema"];
                        });
                        delete customRules["$schema"];
        
                        // Concat rule-lists to engine config in order
                        let config = Object.assign({}, ...fetchedRules, customRules);
        
                        GDPRConfig.getConsentValues().then((consentTypes)=>{
                            GDPRConfig.getDebugValues().then((debugValues)=>{
                                GDPRConfig.getGeneralSettings().then(async (generalSettings)=>{
                                    if(debugValues.debugLog) {
                                        console.log("FetchedRules:", fetchedRules);
                                        console.log("CustomRules:", customRules);
                                    }
                    
                                    ConsentEngine.debugValues = debugValues;
                                    ConsentEngine.generalSettings = generalSettings;
                                    ConsentEngine.topFrameUrl = url;
                                    ConsentEngine.decisionProvider = createDecisionProvider(url);

                                    // Consent-O-Manual: also detect banners from the cookie-notice filter list (top frame only)
                                    ConsentEngine.filterListDetector = null;
                                    if (!insideIframe && generalSettings.useCookieFilterList !== false) {
                                        const selectors = await new Promise((resolve)=>{
                                            chrome.runtime.sendMessage("GetCookieFilters|" + url, (response)=>resolve(response || []));
                                        });
                                        if (selectors.length > 0) {
                                            ConsentEngine.filterListDetector = new FilterListDetector(selectors);
                                            if (debugValues.debugLog) {
                                                console.log("Cookie filter list: " + selectors.length + " selectors for " + url);
                                            }
                                        }
                                    }
            
                                    chrome.runtime.sendMessage("Searching");
                                    let engine = new ConsentEngine(config, consentTypes, (evt)=>{
                                        let result = {
                                            "handled": evt.handled
                                        };
    
                                        if(evt.handled) {
                                            result.cmp = evt.cmpName;
                                            result.clicks = evt.clicks;
                                            result.url = url;
        
                                            chrome.runtime.sendMessage("HandledCMP|"+JSON.stringify(result));
                                            // Filter-list banners report what was really done (it may differ from the choice)
                                            notifyAction(url, evt.action != null
                                                ? {mode: evt.action.mode, source: lastAction != null ? lastAction.source : null}
                                                : lastAction);
                                        } else if(evt.error) {
                                            chrome.runtime.sendMessage("CMPError");
                                        } else {
                                            chrome.runtime.sendMessage("NothingFound");
                                        }
                                    });
            
                                    ConsentEngine.singleton = engine;
            
                                    if(debugValues.debugLog) {
                                        console.log("ConsentEngine loaded " + engine.cmps.length + " of " + Object.keys(config).length + " rules");
                                    }
                                });
                            });
                        });
                    });
                }
            });
        }
    });
}

window.consentScrollBehaviours = {};
function getCalculatedStyles() {
    ["html","html body"].forEach(element=>{
        let node = document.querySelector(element);
        if (node) {
            let styles = window.getComputedStyle(node);
            window.consentScrollBehaviours[element+".consent-scrollbehaviour-override"] = ["position","overflow","overflow-y"].map(property=>{
                return {property:property, value:styles[property]}
            });
        }
    });
}

// Observe styles in order to temporarily restore them if a popup kills them
let topContentTag = document.querySelector("html");
if (topContentTag){
    let observer = new MutationObserver((mutations)=>{
        mutations.forEach((mutation)=>{
            mutation.addedNodes.forEach((node)=>{
                if(node.matches != null && node.matches("body")) {
                    getCalculatedStyles();
                    observer.disconnect();
                }
            })
        });
    });

    observer.observe(topContentTag, {
        childList: true
    });
}
window.addEventListener("message", (event)=>{
    try {
        if(event.data?.enforceScrollBehaviours != null) {
            ConsentEngine.enforceScrollBehaviours(event.data.enforceScrollBehaviours);
        }
    }catch(e) {
        console.error("Error inside message listener:", e);
    }
});

contentScriptRunner().catch((e)=>{
    console.error(e);
});
