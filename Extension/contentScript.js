let url = location.href;
url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));
GDPRConfig.isActive(url).then(async (active) => {
    if (active) {
        chrome.runtime.sendMessage("GetRuleList", (fetchedRules)=>{

            let config =  Object.assign({}, ...fetchedRules);

            GDPRConfig.getCustomRuleLists().then((customRules)=>{

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
                                "url": url
                            }));

                        });

                        if(debugValues.debugLog) {
                            console.log("ConsentEngine loaded " + engine.cmps.length + " of " + Object.keys(config).length + " rules");
                        }
                    });
                });
            });
        });
    }
});
