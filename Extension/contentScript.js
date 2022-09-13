async function contentScriptRunner() {
    let url = location.href;
    
    let insideIframe = window !== window.parent;
    
    if(insideIframe) {
        //We are inside an iframe, request the actual tab url to check if we are active
        url = await new Promise((resolve, reject)=>{
            chrome.runtime.sendMessage("GetTabUrl", (response)=>{
                resolve(response);
            });
        });
    }
    
    url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));

    window.consentScrollBehaviours = {};
    ["html","html body"].forEach(element=>{
        let node = document.querySelector(element);
        if (node){
        let styles = window.getComputedStyle(node);
        window.consentScrollBehaviours[element+".consent-scrollbehaviour-override"] = ["position","overflow","overflow-y"].map(property=>{
            return {property:property, value:styles[property]}
        });
        }
    });

    GDPRConfig.isActive(url).then(async (active) => {
        if (active) {
            chrome.runtime.sendMessage("GetRuleList", (fetchedRules)=>{
    
                GDPRConfig.getCustomRuleLists().then((customRules)=>{
                    fetchedRules.forEach((ruleObj)=>{
                        delete ruleObj["$schema"];
                    });
                    delete customRules["$schema"];
    
                    // Concat rule-lists to engine config in order
                    let config = Object.assign({}, ...fetchedRules, customRules);
    
                    GDPRConfig.getConsentValues().then((consentTypes)=>{
                        GDPRConfig.getDebugValues().then((debugValues)=>{
                            if(debugValues.debugLog) {
                                console.log("FetchedRules:", fetchedRules);
                                console.log("CustomRules:", customRules);
                            }
            
                            ConsentEngine.debugValues = debugValues;
    
                            let engine = new ConsentEngine(config, consentTypes, (stats)=>{
                                chrome.runtime.sendMessage("HandledCMP|"+JSON.stringify({
                                    "cmp": stats.cmpName,
                                    "url": url,
                                    "clicks": stats.clicks
                                }));
    
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

window.addEventListener("message", (event)=>{
    try {
        if(event.data.enforceScrollBehaviours != null) {
            ConsentEngine.enforceScrollBehaviours(event.data.enforceScrollBehaviours);
        }
    }catch(e) {
        console.error("Error inside message listener:", e);
    }
});

contentScriptRunner().catch((e)=>{
    console.error(e);
});