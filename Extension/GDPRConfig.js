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

    static async setGeneralSettings(newGeneralSettings) {
        // Merge so that callers updating one setting don't wipe the others
        const current = await GDPRConfig.getGeneralSettings();
        return new Promise((resolve, reject)=>{
            chrome.storage.sync.set({
                generalSettings: Object.assign({}, current, newGeneralSettings)
            }, () => {
                resolve();
            });
        });
    }    

    /* ------------------------------------------------------------------
     * Consent-O-Matic Plus: global overrides and per-site preferences
     *
     * Resolution order when a CMP is detected on <host>:
     *   1. sitePreferences[host]          (per-site override, storage.local)
     *   2. generalSettings.defaultMode    (global behaviour, storage.sync)
     * A mode of "ask" means the unified in-page popup is shown.
     * ------------------------------------------------------------------ */

    static normalizeHost(host) {
        if (host == null) return "";
        // Preferences are per site, so ignore the port and a leading "www."
        return ("" + host).toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
    }

    static getSitePreferences() {
        return new Promise((resolve)=>{
            chrome.storage.local.get({
                sitePreferences: {}
            }, (result)=>{
                resolve(result.sitePreferences || {});
            });
        });
    }

    static async getSitePreference(host) {
        const prefs = await GDPRConfig.getSitePreferences();
        return prefs[GDPRConfig.normalizeHost(host)] || null;
    }

    static async setSitePreference(host, preference) {
        host = GDPRConfig.normalizeHost(host);
        if (host === "") return;
        const prefs = await GDPRConfig.getSitePreferences();
        if (preference == null) {
            delete prefs[host];
        } else {
            if (!GDPRConfig.MODES.includes(preference.mode)) {
                throw new Error("Unknown consent mode: " + preference.mode);
            }
            const stored = {
                mode: preference.mode,
                updated: Date.now()
            };
            if (preference.mode === "custom") {
                stored.values = GDPRConfig.sanitizeValues(preference.values);
            }
            prefs[host] = stored;
        }
        return new Promise((resolve)=>{
            chrome.storage.local.set({
                sitePreferences: prefs
            }, ()=>{
                resolve();
            });
        });
    }

    static clearSitePreferences() {
        return new Promise((resolve)=>{
            chrome.storage.local.set({
                sitePreferences: {}
            }, ()=>{
                resolve();
            });
        });
    }

    static sanitizeValues(values) {
        const result = {};
        Object.keys(GDPRConfig.defaultValues).forEach((key)=>{
            result[key] = values != null && values[key] === true;
        });
        return result;
    }

    /**
     * Turns a mode into the consent values the engine understands ({A: bool, B: bool, ...}).
     * Returns null for "ask" since that needs a user decision.
     */
    static valuesForMode(mode, subsetValues, customValues) {
        switch (mode) {
            case "acceptAll": {
                const all = {};
                Object.keys(GDPRConfig.defaultValues).forEach((key)=>{ all[key] = true; });
                return all;
            }
            case "rejectAll":
                return GDPRConfig.sanitizeValues({});
            case "subset":
                return GDPRConfig.sanitizeValues(subsetValues);
            case "custom":
                return GDPRConfig.sanitizeValues(customValues);
            default:
                return null;
        }
    }

    /**
     * Works out what should happen on the given host.
     * Returns {mode, values, source} where source is "site" or "global".
     * values is null when mode is "ask".
     */
    static async resolveDecision(host) {
        const [sitePref, generalSettings, subsetValues] = await Promise.all([
            GDPRConfig.getSitePreference(host),
            GDPRConfig.getGeneralSettings(),
            GDPRConfig.getConsentValues()
        ]);

        let mode = generalSettings.defaultMode;
        let source = "global";
        let customValues = null;

        if (sitePref != null && GDPRConfig.MODES.includes(sitePref.mode)) {
            mode = sitePref.mode;
            source = "site";
            customValues = sitePref.values;
        }

        if (!GDPRConfig.MODES.includes(mode)) {
            mode = GDPRConfig.defaultSettings.defaultMode;
        }

        return {
            mode: mode,
            source: source,
            values: GDPRConfig.valuesForMode(mode, subsetValues, customValues)
        };
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
    "hideInsteadOfPIP": false,
    // Consent-O-Matic Plus: "ask" | "acceptAll" | "rejectAll" | "subset"
    "defaultMode": "ask"
};

// All modes a decision can have. "custom" is only valid as a per-site preference.
GDPRConfig.MODES = ["ask", "acceptAll", "rejectAll", "subset", "custom"];

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
