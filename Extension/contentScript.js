import GDPRConfig from "./GDPRConfig.js";
import ConsentEngine from "./ConsentEngine.js";
import UnifiedPopup from "./UnifiedPopup.js";

const insideIframe = window !== window.parent;

/**
 * Shows the unified popup in this (top) frame and returns the user's answer, or null.
 */
async function askUser({host, cmpName}) {
    const subsetValues = await GDPRConfig.getConsentValues();
    return UnifiedPopup.show({host, cmpName, subsetValues});
}

/**
 * Consent-O-Matic Plus decision provider used by the engine.
 * Resolves per-site preference -> global default -> unified popup.
 */
function createDecisionProvider(host) {
    return async (cmpName)=>{
        const decision = await GDPRConfig.resolveDecision(host);
        if (ConsentEngine.debugValues.debugLog) {
            console.log("Consent-O-Matic Plus decision for", host, decision);
        }
        if (decision.mode !== "ask") {
            return decision.values;
        }

        let answer;
        if (!insideIframe) {
            answer = await askUser({host, cmpName});
        } else {
            // The CMP lives in an iframe: show the popup in the top frame instead of inside a tiny iframe
            answer = await new Promise((resolve)=>{
                chrome.runtime.sendMessage("AskUser|" + JSON.stringify({host, cmpName}), (response)=>{
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

        const subsetValues = await GDPRConfig.getConsentValues();
        return GDPRConfig.valuesForMode(answer.mode, subsetValues, answer.values);
    };
}

// The top frame hosts the unified popup for CMPs found in child iframes
if (!insideIframe) {
    chrome.runtime.onMessage.addListener((message, sender, reply)=>{
        if (message != null && message.type === "ShowUnifiedPopup") {
            askUser(message).then(reply, ()=>reply(null));
            return true;
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
                                GDPRConfig.getGeneralSettings().then((generalSettings)=>{
                                    if(debugValues.debugLog) {
                                        console.log("FetchedRules:", fetchedRules);
                                        console.log("CustomRules:", customRules);
                                    }
                    
                                    ConsentEngine.debugValues = debugValues;
                                    ConsentEngine.generalSettings = generalSettings;
                                    ConsentEngine.topFrameUrl = url;
                                    ConsentEngine.decisionProvider = createDecisionProvider(url);
            
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
