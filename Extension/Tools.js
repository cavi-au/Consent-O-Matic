class Tools {
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

            if(ConsentEngine.debugValues.debugLog) {
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
            let filterMultipleSpacesRegex = /\s{2,}/gm;

            possibleTargets = possibleTargets.filter((possibleTarget) => {
                let textContent = possibleTarget.textContent.toLowerCase().replace(filterMultipleSpacesRegex, " ");

                if (Array.isArray(options.textFilter)) {
                    let foundText = false;

                    for (let text of options.textFilter) {
                        if (textContent.indexOf(text.toLowerCase().replace(filterMultipleSpacesRegex, " ")) !== -1) {
                            foundText = true;
                            break;
                        }
                    }

                    return foundText;
                } else if (options.textFilter != null) {
                    return textContent.indexOf(options.textFilter.toLowerCase()) !== -1;
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

        if(ConsentEngine.debugValues.debugLog) {
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
