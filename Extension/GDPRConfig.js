class GDPRConfig {
    static getLogEntries() {
        return new Promise((resolve, reject)=>{
            chrome.storage.local.get({
                logEntries: []
            }, (result)=>{
                resolve(result.logEntries);
            });
        });
    }

    static setLogEntries(logEntries) {
        return new Promise((resolve, reject)=>{
            chrome.storage.local.set({
                logEntries: logEntries
            }, ()=>{
                resolve();
            });
        });
    }

    static getConsentValues() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                consentValues: GDPRConfig.defaultValues
            }, (result) => {
                resolve(result.consentValues);
            });
        });
    }
    
    static getDebugValues() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                debugFlags: GDPRConfig.defaultDebugFlags
            }, (result) => {
                resolve(result.debugFlags);
            });
        });
    }    

    static getCustomRuleLists() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get({
                customRuleLists: {}
            }, (result) => {
                resolve(result.customRuleLists);
            });
        });
    }

    static setCustomRuleLists(lists) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({
                customRuleLists: lists
            }, () => {
                resolve();
            });
        });
    }

    static getRuleLists() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                ruleLists: GDPRConfig.defaultRuleLists
            }, (result) => {
                resolve(result.ruleLists);
            });
        });
    }

    static setRuleLists(lists) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({
                ruleLists: lists
            }, () => {
                resolve();
            });
        });
    }

    static removeRuleList(list) {
        return new Promise((resolve, reject) => {
            GDPRConfig.getRuleLists().then((ruleLists) => {
                GDPRConfig.setRuleLists(ruleLists.filter((ruleList) => {
                    return ruleList !== list;
                })).then(() => {
                    resolve();
                });
            });
        });
    }

    static addRuleList(list) {
        return new Promise((resolve, reject) => {
            GDPRConfig.getRuleLists().then((ruleLists) => {
                ruleLists.push(list);
                GDPRConfig.setRuleLists(ruleLists).then(() => {
                    resolve();
                });
            });
        });
    }

    static isActive(url) {
        return new Promise((resolve, reject)=>{
            chrome.storage.sync.get({
                disabledPages: {}
            }, ({disabledPages: disabledPages}) => {
                resolve(disabledPages[url] == null);
            });
        });
    }

    static setPageActive(url, active) {
        return new Promise((resolve, reject)=>{
            chrome.storage.sync.get({
                disabledPages: {}
            }, ({disabledPages: disabledPages}) => {
                if(active) {
                    delete disabledPages[url];
                } else {
                    disabledPages[url] = true;
                }
                chrome.storage.sync.set({
                    disabledPages: disabledPages
                }, ()=>{
                    resolve();
                });
            });
        });
    }
    
    static async getDebugFlags() {
        let debugValues = await GDPRConfig.getDebugValues();

        return [
            {
                "name": "clickDelay",
                "description": "Wait a short time between performing each action or mouse gesture",
                "value": debugValues.clickDelay
            },
            {
                "name": "skipSubmit",
                "description": "Perform actions normally but avoid submitting the form when done",
                "value": debugValues.skipSubmit
            },
            {
                "name": "paintMatchers",
                "description": "Visual feedback while matching items in the form",
                "value": debugValues.paintMatchers
            },
            {
                "name": "debugClicks",
                "description": "Debug clicks to the log",
                "value": debugValues.debugClicks
            },
            {
                "name": "alwaysForceRulesUpdate",
                "description": "Always force a reload of the rules on each load",
                "value": debugValues.alwaysForceRulesUpdate
            },
            {
                "name": "skipHideMethod",
                "description": "Skips the HIDE_CMP method, to better see whats going on behind the scenes.",
                "value": debugValues.skipHideMethod
            },
            {
                "name": "debugLog",
                "description": "Enables extra logging",
                "value": debugValues.debugLog
            }
        ];
    }

    static async getConsentTypes() {
        let consentValues = await GDPRConfig.getConsentValues();

        return [
            {
                "name": "Information Storage and Access",
                "description": "Storage of information or access to information that is already stored on your device - such as advertising identifiers, device identifiers, cookies, and similar technologies.",
                "type": "D",
                "value": consentValues.D
            },
            {
                "name": "Preferences and Functionality",
                "description": "Allow sites to remember choices you make (such as your user name, language or the region you are located in) and provide enhanced, more personal features. For instance, these cookies can be used to remember your login details, changes you have made to text size, fonts and other parts of web pages that you can customize. They may also be used to provide services you have asked for such as watching a video or commenting on a blog. The information in these cookies is not used to track your browsing activity on other websites.",
                "type": "A",
                "value": consentValues.A
            },
            {
                "name": "Performance and Analytics",
                "description": "The collection of information, and combination with previously collected information, to measure, understand, and report, on your usage of the services. This allows websites to count visits and traffic sources so they can measure and improve the performance of the site. It helps them know which pages are the most and least popular, see how visitors move around the site, and where visitors come from.",
                "type": "B",
                "value": consentValues.B
            },
            {
                "name": "Content selection, delivery, and reporting",
                "description": "Collection of information, and combination with previously collected information, to select and deliver <b>content</b> for you, and to measure the delivery and effectiveness of such content. This includes using previously collected information about your interests to select content, processing data about what content was shown, how often or how long it was shown, when and where it was shown, and whether you took any action related to the content, including for example clicking on content. The data will be used to personalise content on the website itself, but also in other contexts such as other websites, apps, browsers, and devices.",
                "type": "E",
                "value": consentValues.E
            },
            {
                "name": "Ad selection, delivery, and reporting",
                "description": "Collection of information, and combination with previously collected information, to select and deliver <b>advertisements</b>, and to measure the delivery and effectiveness of such advertisements. This includes using previously collected information about your interests to select ads, processing data about what advertisements were shown, how often they were shown, when and where they were shown, and whether you took any action related to the advertisement, including for example clicking an ad or making a purchase. The data will be used to personalise advertising on the website itself, but also in other contexts such as other websites, apps, browsers, and devices.<br><br>Also includes:<br>Google",
                "type": "F",
                "value": consentValues.F
            },
            {
                "name": "Other Purposes",
                "description": "Unclassified data collection for which the purpose is not clearly described by the website or where the data collection and processing does not fit any other category",
                "type": "X",
                "value": consentValues.X
            }
        ];
    }

    static setConsentValues(consentValues) {
        return new Promise((resolve, reject)=>{
            consentValues = Object.assign({}, GDPRConfig.defaultValues, consentValues);

            chrome.storage.sync.set({
                consentValues: consentValues
            }, () => {
                resolve();
            });
        });
    }
    
    static setDebugFlags(newDebugFlags) {
        return new Promise((resolve, reject)=>{
            newDebugFlags = Object.assign({}, GDPRConfig.defaultDebugFlags, newDebugFlags);

            chrome.storage.sync.set({
                debugFlags: newDebugFlags
            }, () => {
                resolve();
            });
        });
    }    

    static clearRuleCache() {
        return new Promise((resolve, reject)=>{
            chrome.storage.local.set({
                cachedEntries: {}
            }, ()=>{
                resolve();
            });
        });
    }
}

GDPRConfig.defaultValues = {
    "A": false,
    "B": false,
    "D": false,
    "E": false,
    "F": false,
    "X": false
};

GDPRConfig.defaultRuleLists = [
    "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/Rules.json",
];


GDPRConfig.defaultDebugFlags = {
    "clickDelay": false,
    "skipSubmit": false,
    "paintMatchers": false,
    "debugClicks": false,
    "alwaysForceRulesUpdate": false,
    "skipHideMethod": false,
    "debugLog": false
}