let url = location.href;
url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));
GDPRConfig.isActive(url).then(async (active) => {
    if (active) {
	window.consentScrollBehaviours = {};
	["html","html body"].forEach(element=>{
	    let node = document.querySelector(element);
	    if (node){
		let styles = window.getComputedStyle(node);
		window.consentScrollBehaviours[element] = ["position","overflow","overflow-y"].map(property=>{
		    return {property:property, value:styles[property]}
		});
	    }
	});

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
