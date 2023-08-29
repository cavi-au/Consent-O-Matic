class GDPRConfig {
    static getStatistics() {
        return new Promise((resolve, reject)=>{
            chrome.storage.local.get({
                statistics: {
		            clicks: 0,
		            cmps: {}
		        }
            }, (result)=>{
                resolve(result.statistics);
            });
        });
    }

    static setStatistics(entries) {
        return new Promise((resolve, reject)=>{
            chrome.storage.local.set({
                statistics: entries
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
                resolve(Object.assign({}, GDPRConfig.defaultValues, result.consentValues));
            });
        });
    }
    
    static getDebugValues() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                debugFlags: {}
            }, (result) => {
                resolve(Object.assign({}, GDPRConfig.defaultDebugFlags, result.debugFlags));
            });
        });
    }    

    static getGeneralSettings() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                generalSettings: {}
            }, (result) => {
                resolve(Object.assign({}, GDPRConfig.defaultSettings, result.generalSettings));
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
                "description": Language.getString("CLICK_DELAY_DESCRIPTION"),
                "value": debugValues.clickDelay
            },
            {
                "name": "skipSubmit",
                "description": Language.getString("SKIP_SUBMIT_DESCRIPTION"),
                "value": debugValues.skipSubmit
            },
            {
                "name": "paintMatchers",
                "description": Language.getString("PAINT_MATCHERS_DESCRIPTION"),
                "value": debugValues.paintMatchers
            },
            {
                "name": "debugClicks",
                "description": Language.getString("DEBUG_CLICKS_DESCRIPTION"),
                "value": debugValues.debugClicks
            },
            {
                "name": "alwaysForceRulesUpdate",
                "description": Language.getString("ALWAYS_FORCE_UPDATE_DESCRIPTION"),
                "value": debugValues.alwaysForceRulesUpdate
            },
            {
                "name": "skipHideMethod",
                "description": Language.getString("SKIP_HIDE_DESCRIPTION"),
                "value": debugValues.skipHideMethod
            },
            {
                "name": "debugLog",
                "description": Language.getString("EXTRA_DEBUG_DESCRIPTION"),
                "value": debugValues.debugLog
            },
            {
                "name": "debugTranslations",
                "description": Language.getString("DEBUG_TRANSLATION_DESCRIPTION"),
                "value": debugValues.debugTranslations
            },
            {
                "name": "skipSubmitConfirmation",
                "description": Language.getString("SKIP_SUBMIT_CONFIRMATION"),
                "value": debugValues.skipSubmitConfirmation
            },
            {
                "name": "dontHideProgressDialog",
                "description": "Dont hide ConsentOMatic progress dialog",
                "value": debugValues.dontHideProgressDialog
            },
            {
                "name": "skipOpenMethod",
                "description": "Executing the program except for the open method",
                "value": debugValues.skipOpenMethod
            }
        ];
    }

    static async getConsentTypes() {
        let consentValues = await GDPRConfig.getConsentValues();

        return [
            {
                "name": Language.getString("PREFERENCES_NAME"),
                "description": Language.getString("PREFERENCES_DESCRIPTION"),
                "type": "A",
                "value": consentValues.A
            },
            {
                "name": Language.getString("PERFORMANCE_NAME"),
                "description": Language.getString("PERFORMANCE_DESCRIPTION"),
                "type": "B",
                "value": consentValues.B
            },
            {
                "name": Language.getString("INFORMATION_NAME"),
                "description": Language.getString("INFORMATION_DESCRIPTION"),
                "type": "D",
                "value": consentValues.D
            },
            {
                "name": Language.getString("CONTENT_NAME"),
                "description": Language.getString("CONTENT_DESCRIPTION"),
                "type": "E",
                "value": consentValues.E
            },
            {
                "name": Language.getString("AD_NAME"),
                "description": Language.getString("AD_DESCRIPTION"),
                "type": "F",
                "value": consentValues.F
            },
            {
                "name": Language.getString("OTHER_NAME"),
                "description": Language.getString("OTHER_DESCRIPTION"),
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
            chrome.storage.sync.set({
                debugFlags: newDebugFlags
            }, () => {
                resolve();
            });
        });
    }    

    static setGeneralSettings(newGeneralSettings) {
        return new Promise((resolve, reject)=>{
            chrome.storage.sync.set({
                generalSettings: newGeneralSettings
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

GDPRConfig.defaultSettings = {
    "hideInsteadOfPIP": false
}

GDPRConfig.defaultDebugFlags = {
    "clickDelay": false,
    "skipSubmit": false,
    "paintMatchers": false,
    "debugClicks": false,
    "alwaysForceRulesUpdate": false,
    "skipHideMethod": false,
    "debugLog": false,
    "debugTranslations": false,
    "skipSubmitConfirmation": false,
    "dontHideProgressDialog": false,
    "skipOpenMethod": false

};

GDPRConfig.defaultRuleLists = [
    "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules-list.json",
];
