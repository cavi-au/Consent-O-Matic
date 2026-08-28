import ConsentEngine from "./ConsentEngine.js";

export default class Tools {
    /**
     * Normalizes text for language-insensitive comparison in textFilter.
     *
     * Cookie banners are rarely written in English, and a plain lowercase
     * substring match fails on several characters that look identical to a
     * user but differ by codepoint:
     *
     *  - Accents: a rule written "Funktionalität" will not match a page that
     *    renders "Funktionalitat", or the same string in NFD form.
     *  - Typographic apostrophes: U+2019 (') vs U+0027 ('). Sites and rules
     *    disagree constantly, and one character is enough to miss the button.
     *  - Non-breaking spaces (U+00A0) and other Unicode whitespace, which are
     *    common in European layouts and never equal a plain space.
     *
     * Normalizing both sides only ever makes matching more permissive, so
     * existing rules keep working.
     */
    static normalizeText(str) {
        if (str == null) {
            return "";
        }

        return String(str)
            .normalize("NFKD")
            // Strip combining diacritics: à -> a, ü -> u, ç -> c
            .replace(/[\u0300-\u036f]/g, "")
            // Typographic apostrophes and primes -> straight apostrophe
            .replace(/[\u2018\u2019\u201A\u201B\u2032\u00B4\u0060]/g, "'")
            // Typographic quotes -> straight quote
            .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, "\"")
            // Dashes -> hyphen
            .replace(/[\u2010-\u2015\u2212]/g, "-")
            // Any whitespace run, including NBSP, -> single space
            .replace(/[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/g, " ")
            .trim()
            .toLowerCase();
    }

    static setBase(base) {
        Tools.base = base;
    }

    static getBase() {
        return Tools.base;
    }

    static findElement(options, parent = null, multiple = false) {
        let possibleTargets = null;

        if(options.selector.trim() === ":scope") {
            //Select current root
            if(parent != null) {
                possibleTargets = [parent];
            } else {
                if (Tools.base != null) {
                    possibleTargets = [Tools.base];
                } else {
                    possibleTargets = [document];
                }

            }

            if(ConsentEngine.debugValues.debugRules) {
                console.log("Special :scope handling, selecting current root:", possibleTargets);
            }
        } else {
    	    // Find the right point to start from
            let top = document;
            if (parent != null) {
                top = parent;
            } else if (Tools.base != null){
                top = Tools.base;
            }

    	    // Consider shadow roots, even closed ones
            if (top.shadowRoot){
                top = top.shadowRoot;
            } else if (top.openOrClosedShadowRoot){ // Firefox
    	        top = top.openOrClosedShadowRoot;
            } else if (top instanceof HTMLElement && chrome && chrome.dom && chrome.dom.openOrClosedShadowRoot(top)){ // Chromium
    	        top = chrome.dom.openOrClosedShadowRoot(top);
            }
            possibleTargets = Array.from(top.querySelectorAll(options.selector));
        }

        const clonedPossibleTargets = possibleTargets.slice();

        if (options.textFilter != null) {
            possibleTargets = possibleTargets.filter((possibleTarget) => {
                let textContent = Tools.normalizeText(possibleTarget.textContent);

                if (Array.isArray(options.textFilter)) {
                    let foundText = false;

                    for (let text of options.textFilter) {
                        if (textContent.indexOf(Tools.normalizeText(text)) !== -1) {
                            foundText = true;
                            break;
                        }
                    }

                    return foundText;
                } else if (options.textFilter != null) {
                    return textContent.indexOf(Tools.normalizeText(options.textFilter)) !== -1;
                }
            });
        }

        if (options.styleFilters != null) {
            possibleTargets = possibleTargets.filter((possibleTarget) => {
                let styles = window.getComputedStyle(possibleTarget);

                let keep = true;

                for (let styleFilter of options.styleFilters) {
                    let option = styles[styleFilter.option]

                    if (styleFilter.negated) {
                        keep = keep && (option !== styleFilter.value);
                    } else {
                        keep = keep && (option === styleFilter.value);
                    }
                }

                return keep;
            });
        }

        if (options.displayFilter != null) {
            possibleTargets = possibleTargets.filter((possibleTarget) => {
                if(possibleTarget.matches(".ConsentOMatic-CMP-NoDetect")) {
                    return !options.displayFilter;
                }

                if(options.displayFilter) {
                    //We should be displayed
                    return possibleTarget.offsetHeight !== 0;
                } else {
                    //We should not be displayed
                    return possibleTarget.offsetHeight === 0;
                }
            });
        }

        if (options.iframeFilter != null) {
            possibleTargets = possibleTargets.filter((possibleTarget) => {
                if(options.iframeFilter) {
                    //We should be inside an iframe
                    return window.location !== window.parent.location;
                } else {
                    //We should not be inside an iframe
                    return window.location === window.parent.location;
                }
            });
        }

        if(options.childFilter != null) {
            possibleTargets = possibleTargets.filter((possibleTarget) => {
                let oldBase = Tools.base;
                Tools.setBase(possibleTarget);
                let childResults = Tools.find(options.childFilter);
                Tools.setBase(oldBase);
                if(options.childFilterNegated) {
                    return childResults.target == null;
                } else {
                    return childResults.target != null;
                }
            });
        }

        if(ConsentEngine.debugValues.debugRules) {
            console.groupCollapsed("findElement:", options.selector, possibleTargets.length);
            console.log("Options:", options, "Parent:", parent);
            console.log("Possible targets before filter: ", clonedPossibleTargets);
            console.log("Possible targets after filter: ", possibleTargets);
            console.log("Returned result:", multiple?possibleTargets:possibleTargets[0]);
            console.groupEnd();
        }

        if (multiple) {
            return possibleTargets;
        } else {
            if (possibleTargets.length > 1) {
                if(ConsentEngine.debugValues.debugLog) {
                    console.warn("Multiple possible targets: ", possibleTargets, options, parent);
                }
            }

            return possibleTargets[0];
        }
    }

    static find(options, multiple = false) {
        let results = [];
        if (options.parent != null) {
            let parent = Tools.findElement(options.parent, null, multiple);
            if (parent != null) {
                if (parent instanceof Array) {
                    parent.forEach((p) => {
                        let targets = Tools.findElement(options.target, p, multiple);
                        if (targets instanceof Array) {
                            targets.forEach((target) => {
                                results.push({
                                    "parent": p,
                                    "target": target
                                });
                            });
                        } else {
                            results.push({
                                "parent": p,
                                "target": targets
                            });
                        }
                    });

                    return results;
                } else {
                    let targets = Tools.findElement(options.target, parent, multiple);
                    if (targets instanceof Array) {
                        targets.forEach((target) => {
                            results.push({
                                "parent": parent,
                                "target": target
                            });
                        });
                    } else {
                        results.push({
                            "parent": parent,
                            "target": targets
                        });
                    }
                }
            }
        } else {
            let targets = Tools.findElement(options.target, null, multiple);
            if (targets instanceof Array) {
                targets.forEach((target) => {
                    results.push({
                        "parent": null,
                        "target": target
                    });
                });
            } else {
                results.push({
                    "parent": null,
                    "target": targets
                });
            }
        }

        if (results.length === 0) {
            results.push({
                "parent": null,
                "target": null
            });
        }

        if (multiple) {
            return results;
        } else {
            if (results.length !== 1) {
                console.warn("Multiple results found, even though multiple false", results);
            }

            return results[0];
        }
    }
}

Tools.base = null;
