import GDPRConfig from './GDPRConfig.js';

const STATUS = {
    "INIT": 0,
    "NOTHING": 1,
    "SEARCHING": 2,
    "ERROR": 3,
    "HANDLED": 4
}

chrome.runtime.onMessage.addListener(function (message, sender, reply) {
    console.log("Got msg", message);
    try {
    switch (message.split("|")[0]) {
        case "GetTabUrl": {
            reply(sender.tab.url);
            return false;
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

        case "CMPError": {
            if(tabStatusMap.get(sender.tab.id) !== STATUS.HANDLED) {
                setBadgeCheckmark("\u2717", sender.tab.id);
                tabStatusMap.set(sender.tab.id, STATUS.ERROR);
            }
	    reply();
            return false;
        }

        case "NothingFound": {
            if(tabStatusMap.get(sender.tab.id) !== STATUS.HANDLED) {
                setBadgeCheckmark("", sender.tab.id);
                tabStatusMap.set(sender.tab.id, STATUS.NOTHING);
            }
	    reply();
            return false;
        }

        case "Searching": {
            if(tabStatusMap.get(sender.tab.id) !== STATUS.HANDLED) {
                setBadgeCheckmark("\uD83D\uDD0E", sender.tab.id);
                tabStatusMap.set(sender.tab.id, STATUS.SEARCHING);
            }
	    reply();
            return false;
        }

        case "HandledCMP": {
            let json = JSON.parse(message.split("|")[1]);

            setBadgeCheckmark("\u2714", sender.tab.id);

            tabStatusMap.set(sender.tab.id, STATUS.HANDLED);

            GDPRConfig.getStatistics().then((entries)=>{
                entries.clicks += json.clicks;
                
                if (!entries.cmps.hasOwnProperty(json.cmp)){
                    entries.cmps[json.cmp] = {
                        filledForms: 0,
                        clicks: 0
                    }
                }
                entries.cmps[json.cmp].filledForms ++;
                entries.cmps[json.cmp].clicks += json.clicks;

                GDPRConfig.setStatistics(entries);
            });
	    reply();
            return false;
        }

        default:
            console.warn("Unhandled message:", message);
    }
    } catch (ex){
	console.log(ex);
    }
});

function setBadgeCheckmark(text, id) {
    if (chrome.browserAction){
        if (chrome.browserAction.setBadgeText){
            chrome.browserAction.setBadgeText({
                text: text,
                tabId: id
            });
        }
        if (chrome.browserAction.setBadgeBackgroundColor){
            chrome.browserAction.setBadgeBackgroundColor({
                color: "white",
                tabId: id
            });
        }
    }
}

function fetchRules(forceUpdate) {
    // Make sure the cached rule-lists are up-to-date, fetch updates if needed
    let maxStaleness = 22 * 3600 + (Math.random()*26*3600);  // Fetch frequency in seconds
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
                            console.log("Failed to fetch CoM rule list, check the URL", ruleList);
                            if(entry != null) {
                                rules.push(entry.rules);
                            } else {
                        	console.log("Giving up entirely on rule list, no cache available either",ruleList);
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

let tabStatusMap = new Map();

chrome.tabs.onUpdated.addListener((tabId, info, tab)=>{
    if(info.status != null && info.status === "Loading") {
        setBadgeCheckmark("", tabId);
        tabStatusMap.set(tabId, STATUS.INIT);
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

// Show onboarding page on first load - DISABLED for PeerSky Browser
// GDPRConfig.getDebugValues().then((config)=>{
//     if (config.autoOpenOptionsTab){
//         config.autoOpenOptionsTab = false;
//         GDPRConfig.setDebugValues(config);
//         chrome.tabs.create({ url: chrome.runtime.getURL("options.html") }, function (tab) {
//             console.log("Launched initial onboarding page");
//         });
//     }
// })
