//Check if active on this server
chrome.runtime.sendMessage("GetTabUrl", (url)=>{
    url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));

    GDPRConfig.isActive(url).then(async (active) => {
        if (active) {
        
            chrome.runtime.sendMessage("GetRuleList", (fetchedRules)=>{

                console.log("FetchedRules:", fetchedRules);
            
                let config =  Object.assign({}, ...fetchedRules);

                GDPRConfig.getCustomRuleLists().then((customRules)=>{

                    console.log("CustomRules:", customRules);

                    // Concat rule-lists to engine config in order
                    let config = Object.assign({}, ...fetchedRules, customRules);

                    GDPRConfig.getConsentValues().then((consentTypes)=>{
                        GDPRConfig.getDebugValues().then((debugValues)=>{
                            let engine = new ConsentEngine(config, consentTypes, debugValues, (stats)=>{
                                console.log("We handled a CMP: ", stats);

                                chrome.runtime.sendMessage("HandledCMP|"+JSON.stringify({
                                    "cmp": stats.cmpName,
                                    "url": url
                                }));

                            });
                            console.log("ConsentEngine loaded " + engine.cmps.length + " of " + Object.keys(config).length + " rules");
                        });
                    });
                });
            });
        }
    });
});
