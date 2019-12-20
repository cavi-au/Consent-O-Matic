chrome.runtime.onMessage.addListener(function (message, sender, reply) {
    console.log("Got message: ", message);

    switch (message) {
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

        default:
            console.log("Unhandled message:", message);
    }
});

function fetchRules(forceUpdate) {
    // Make sure the cached rule-lists are up-to-date, fetch updates if needed
    let maxStaleness = 60 * 15;  // Fetch frequency in seconds
    let rulePromise = new Promise((resolve, reject) => {
        GDPRConfig.getRuleLists().then((ruleLists) => {
            chrome.storage.local.get({ cachedEntries: {} }, async function ({ cachedEntries: cachedEntries }) {
                let rules = [];
                for (let ruleList of ruleLists) {
                    let entry = cachedEntries[ruleList];

                    console.log(entry);

                    // Check for cache
                    if (!forceUpdate && (entry != null && 'timestamp' in entry && ((Date.now() / 1000) - entry.timestamp) < maxStaleness && 'rules' in entry)) {
                        rules.push(entry.rules);
                    } else {
                        // No cache, try to fetch
                        console.log("no cache for " + ruleList);
                        try {

                            let response = await fetch(ruleList, { cache: "no-store" });
                            let theList = await response.json();
                            let storedEntry = {};
                            rules.push(theList);
                            cachedEntries[ruleList] = {
                                timestamp: Date.now() / 1000,
                                rules: theList
                            };

                            console.log("Fetched: ", theList);

                        } catch (e) {
                            console.warn("Error fetching rulelist: ", ruleList, e.message);
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