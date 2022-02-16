chrome.runtime.onMessage.addListener(function (message, sender, reply) {
    switch (message.split("|")[0]) {
        case "GetTabUrl": {
            reply(sender.tab.url);
            return Promise.resolve("Response already sent...");
        }

        case "GetRuleList": {
            GDPRConfig.getDebugValues().then((debugValues)=>{
                fetchRules(debugValues.alwaysForceRulesUpdate).then((rules)=>{
                    reply(rules);
                });
            });
            //Return true to keep reply working after method has ended, async response
            return true;
        }

        case "GetCustomRuleList": {
            GDPRConfig.getCustomRuleLists().then((customRules)=>{
                reply(customRules);
            });
            //Return true to keep reply working after method has ended, async response
            return true;
        }

        case "AddCustomRule": {
            let newRule = JSON.parse(message.substring(message.indexOf("|")+1));

            GDPRConfig.getCustomRuleLists().then((customRules)=>{
                let combinedCustomRules = Object.assign({}, customRules, newRule);

                GDPRConfig.setCustomRuleLists(combinedCustomRules);
            });

            return false;
        }

        case "DeleteCustomRule": {
            let deleteRule = message.split("|")[1];

            GDPRConfig.getCustomRuleLists().then((customRules)=>{
                delete customRules[deleteRule];

                GDPRConfig.setCustomRuleLists(customRules).then(()=>{
                    reply();
                });
            });

            return true;
        }

        case "HandledCMP": {
            let json = JSON.parse(message.split("|")[1]);

            setBadgeCheckmark(true, sender.tab.id);

            GDPRConfig.getLogEntries().then((log)=>{
                log.push({
                    "timestamp": Date.now(),
                    "cmp": json.cmp,
                    "page": json.url
                });
                GDPRConfig.setLogEntries(log);
            });

            return false;
        }

        default:
            console.warn("Unhandled message:", message);
    }
});

function setBadgeCheckmark(enabled, id) {
    let text = "";

    if(enabled) {
        text = "\u2714";
    }

    chrome.browserAction.setBadgeText({
        text: text,
        tabId: id
    });
}

function fetchRules(forceUpdate) {
    // Make sure the cached rule-lists are up-to-date, fetch updates if needed
    let maxStaleness = 60 * 15;  // Fetch frequency in seconds
    let rulePromise = new Promise((resolve, reject) => {
        GDPRConfig.getRuleLists().then((ruleLists) => {

            let oldDefaultListIndex = ruleLists.indexOf("https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/Rules.json");

            if(oldDefaultListIndex !== -1) {
                console.log("Cleaning old rule list, and replacing with new reference based list...");
                ruleLists[oldDefaultListIndex] = "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules-list.json"
                GDPRConfig.setRuleLists(ruleLists);
            }

            chrome.storage.local.get({ cachedEntries: {} }, async function ({ cachedEntries: cachedEntries }) {
                let rules = [];
                for (let ruleList of ruleLists) {
                    let entry = cachedEntries[ruleList];

                    // Check for cache
                    if (!forceUpdate && (entry != null && 'timestamp' in entry && ((Date.now() / 1000) - entry.timestamp) < maxStaleness && 'rules' in entry)) {
                        rules.push(entry.rules);
                    } else {
                        // No cache, or to old, try to fetch
                        let theList = await fetchRulesList(ruleList);

                        if(theList != null) {
                            let storedEntry = {};
                            rules.push(theList);
                            cachedEntries[ruleList] = {
                                timestamp: Date.now() / 1000,
                                rules: theList
                            };
                        } else {
                            //Reuse cached entry even though its out of date at this point
                            if(entry != null) {
                                rules.push(entry.rules);
                            }
                        }
                    }
                }

                chrome.storage.local.set({
                    cachedEntries: cachedEntries
                }, () => {
                    resolve(rules);
                });
            });
        });
    });

    return rulePromise;

}

let tabsInfo = new Map();

chrome.tabs.onUpdated.addListener((tabId, info, tab)=>{
    if(info.status != null && info.status === "Loading") {
        setBadgeCheckmark(false, tabId);
    }
});

async function fetchRulesList(ruleList) {
    try {

        let response = await fetch(ruleList, { cache: "no-store" });
        let theList = await response.json();

        let theMergedList = Object.assign({}, theList);
        delete theMergedList.references;

        //If references is present, fetch those and merge into big json object
        if(theList.references != null) {
            let promises = [];
            for(let ref of theList.references) {
                promises.push(fetchRulesList(ref));
            }

            let lists = await Promise.all(promises);

            lists.forEach((list) => {
                Object.assign(theMergedList, list);
            });
        }

        return theMergedList;

    } catch (e) {
        console.warn("Error fetching rulelist: ", ruleList, e.message);
    }

    return null;
}