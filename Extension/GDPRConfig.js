export default class GDPRConfig {
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
                "description": "[[CLICK_DELAY_DESCRIPTION]]",
                "value": debugValues.clickDelay
            },
            {
                "name": "skipSubmit",
                "description": "[[SKIP_SUBMIT_DESCRIPTION]]",
                "value": debugValues.skipSubmit
            },
            {
                "name": "paintMatchers",
                "description": "[[PAINT_MATCHERS_DESCRIPTION]]",
                "value": debugValues.paintMatchers
            },
            {
                "name": "debugClicks",
                "description": "[[DEBUG_CLICKS_DESCRIPTION]]",
                "value": debugValues.debugClicks
            },
            {
                "name": "alwaysForceRulesUpdate",
                "description": "[[ALWAYS_FORCE_UPDATE_DESCRIPTION]]",
                "value": debugValues.alwaysForceRulesUpdate
            },
            {
                "name": "skipHideMethod",
                "description": "[[SKIP_HIDE_DESCRIPTION]]",
                "value": debugValues.skipHideMethod
            },
            {
                "name": "debugLog",
                "description": "[[EXTRA_DEBUG_DESCRIPTION]]",
                "value": debugValues.debugLog
            },
            {
                "name": "debugRules",
                "description": "[[RULES_DEBUG_DESCRIPTION]]",
                "value": debugValues.debugRules
            },
            {
                "name": "debugTranslations",
                "description": "[[DEBUG_TRANSLATION_DESCRIPTION]]",
                "value": debugValues.debugTranslations
            },
            {
                "name": "skipSubmitConfirmation",
                "description": "[[SKIP_SUBMIT_CONFIRMATION]]",
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
            },
            {
                "name": "autoOpenOptionsTab",
                "description": "Automatically open the options tab next time the extension loads",
                "value": debugValues.autoOpenOptionsTab
            }
        ];
    }

    static async getConsentTypes() {
        let consentValues = await GDPRConfig.getConsentValues();

        return [
            {
                "name": "PREFERENCES_NAME",
                "description": "PREFERENCES_DESCRIPTION",
                "type": "A",
                "value": consentValues.A
            },
            {
                "name": "PERFORMANCE_NAME",
                "description": "PERFORMANCE_DESCRIPTION",
                "type": "B",
                "value": consentValues.B
            },
            {
                "name": "INFORMATION_NAME",
                "description": "INFORMATION_DESCRIPTION",
                "type": "D",
                "value": consentValues.D
            },
            {
                "name": "CONTENT_NAME",
                "description": "CONTENT_DESCRIPTION",
                "type": "E",
                "value": consentValues.E
            },
            {
                "name": "AD_NAME",
                "description": "AD_DESCRIPTION",
                "type": "F",
                "value": consentValues.F
            },
            {
                "name": "OTHER_NAME",
                "description": "OTHER_DESCRIPTION",
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
    
    static setDebugValues(newDebugValues) {
        return new Promise((resolve, reject)=>{
            chrome.storage.sync.set({
                debugFlags: newDebugValues
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


    static getHandledCallback() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get({
                handledCallback: GDPRConfig.defaultHandledCallback
            }, (result) => {
                resolve(Function(result.handledCallback));
            });
        });
    }

    static setHandledCallback(handledCallback) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({
                handledCallback: handledCallback
            }, () => {
                resolve();
            });
        });
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
    "debugRules": false,
    "debugTranslations": false,
    "skipSubmitConfirmation": false,
    "dontHideProgressDialog": false,
    "skipOpenMethod": false,
    "autoOpenOptionsTab": true
};

GDPRConfig.defaultRuleLists = [
    "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules-list.json",
];

GDPRConfig.defaultHandledCallback = "";
