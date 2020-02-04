let cmpJson = null;
let customCmpJson = null;
let textCmpJson = null;

let usedNew = false;

let ctrlPressed = false;

let undoQueue = [];

document.addEventListener("keydown", (evt) => {
    if (evt.key === "Control") {
        ctrlPressed = true;
    }
});

document.addEventListener("keyup", (evt) => {
    if (evt.key === "Control") {
        ctrlPressed = false;
    }
    if (evt.key === "z" && ctrlPressed) {
        evt.preventDefault();

        let undoObj = undoQueue.pop();

        if (undoObj != null) {
            console.log("Undoing one step");

            if (undoObj.parent != null) {
                undoObj.parent.insertBefore(undoObj.element, undoObj.nextSibling);
            } else {
                undoObj.element.parentNode.removeChild(undoObj.element);
            }
        } else {
            console.log("Undo queue empty");
        }
    }
});

document.querySelector(".loadButton").addEventListener("click", () => {
    let selectedKey = document.querySelector("#knownRules").value;

    usedNew = true;

    loadFromCmpJson(cmpJson[selectedKey], selectedKey);
});

document.querySelector(".loadCustomButton").addEventListener("click", () => {
    let selectedKey = document.querySelector("#customRules").value;

    usedNew = true;

    loadFromCmpJson(customCmpJson[selectedKey], selectedKey);
});

document.querySelector(".deleteCustomButton").addEventListener("click", () => {
    let selectedKey = document.querySelector("#customRules").value;

    chrome.runtime.sendMessage("DeleteCustomRule|" + selectedKey, () => {
        reloadSelectors();
    });
});

document.querySelector(".loadTextButton").addEventListener("click", () => {
    try {
        let jsonString = document.querySelector("#inputArea").value;
        let json = JSON.parse(jsonString);

        textCmpJson = json;

        loadFromJson(json, document.querySelector("#cmpSelector"));

        if (document.querySelector("#cmpSelector").querySelectorAll("option").length === 1) {
            usedNew = true;
            //Only 1 option, skip ahead
            document.querySelector("#selectCmp").click();
        } else {
            usedNew = false;
            switchView("step2");
        }
    } catch (e) {
        console.log("Unable to load from jsonString:", e);
    }
});

function reloadSelectors() {
    chrome.runtime.sendMessage("GetRuleList", (fetchedRules) => {
        let condensedJson = Object.assign({}, ...fetchedRules);

        cmpJson = condensedJson;

        loadFromJson(condensedJson, document.querySelector("#knownRules"));
    });

    chrome.runtime.sendMessage("GetCustomRuleList", (customRules) => {
        console.log("CustomRules:", customRules);

        customCmpJson = customRules;

        loadFromJson(customRules, document.querySelector("#customRules"));
    });
}

reloadSelectors();

function loadFromJson(json, selectDom, skipAhead = false) {
    selectDom.innerHTML = "";
    Object.keys(json).forEach((key) => {
        let option = document.createElement("option");
        option.textContent = key;
        selectDom.appendChild(option);
    });
}

document.querySelector(".newButton").addEventListener("click", () => {
    usedNew = true;

    loadTemplate("cmp").then(async (cmpDom) => {
        let hide = await loadTemplate("method");
        hide.querySelector("[data-bind='name']").textContent = "HIDE_CMP";
        let open = await loadTemplate("method");
        open.querySelector("[data-bind='name']").textContent = "OPEN_OPTIONS";
        let consent = await loadTemplate("method");
        consent.querySelector("[data-bind='name']").textContent = "DO_CONSENT";
        let save = await loadTemplate("method");
        save.querySelector("[data-bind='name']").textContent = "SAVE_CONSENT";

        cmpDom.querySelector("[data-plug='method']").appendChild(hide);
        cmpDom.querySelector("[data-plug='method']").appendChild(open);
        cmpDom.querySelector("[data-plug='method']").appendChild(consent);
        cmpDom.querySelector("[data-plug='method']").appendChild(save);

        loadFromDom(cmpDom, "myCmp");
    }).catch((e) => {
        console.error(e);
    });
});

document.querySelector("#selectCmp").addEventListener("click", () => {
    let selectedKey = document.querySelector("#cmpSelector").value;

    loadFromCmpJson(textCmpJson[selectedKey], selectedKey);
});

function loadFromCmpJson(json, selectedKey) {
    if (json.methods.find((elm) => {
        return elm.name === "HIDE_CMP";
    }) == null) {
        json.methods.push({
            "name": "HIDE_CMP",
            "action": null
        });
    }

    if (json.methods.find((elm) => {
        return elm.name === "OPEN_OPTIONS";
    }) == null) {
        json.methods.push({
            "name": "OPEN_OPTIONS",
            "action": null
        });
    }

    if (json.methods.find((elm) => {
        return elm.name === "DO_CONSENT";
    }) == null) {
        json.methods.push({
            "name": "DO_CONSENT",
            "action": null
        });
    }

    if (json.methods.find((elm) => {
        return elm.name === "SAVE_CONSENT";
    }) == null) {
        json.methods.push({
            "name": "SAVE_CONSENT",
            "action": null
        });
    }

    JsonParser.parseCmp(json).then((cmpDom) => {
        loadFromDom(cmpDom, selectedKey);
    }).catch((e) => {
        console.error(e);
    });
}

function loadFromDom(cmpDom, name) {
    undoQueue = [];

    document.querySelector(".step3 .rules").innerHTML = "";

    document.querySelector(".step3 .cmpName input").value = name;

    let saveButton = document.querySelector(".step3 .save");

    saveButton = replaceNodeWithClone(saveButton);

    saveButton.addEventListener("click", async () => {
        saveCmp(cmpDom);
    });

    let exportButton = document.querySelector(".step3 .export");

    exportButton = replaceNodeWithClone(exportButton);

    exportButton.addEventListener("click", async () => {
        saveCmp(cmpDom, true);
    });

    document.querySelector(".step3 .rules").append(cmpDom);

    switchView("step3");

    setupDragging();
}

document.querySelector(".step2 .back").addEventListener("click", () => {
    switchView("step1");
    reloadSelectors();
});

document.querySelector(".step3 .back").addEventListener("click", () => {
    let shouldGoBack = confirm("You sure you want to go back? (Unsaved changes will be lost)");
    if (!shouldGoBack) {
        return;
    }

    if (usedNew) {
        switchView("step1");
        reloadSelectors();
    } else {
        switchView("step2");
    }
});

document.querySelector(".step4 .back").addEventListener("click", () => {
    switchView("step3");
});

document.querySelector(".step3 .collapse").addEventListener("click", (evt) => {
    Array.from(document.querySelectorAll(".step3 .rules [data-fold-name]")).forEach((elm) => {
        elm.classList.add("toggled");
    });
});

document.querySelector(".step3 .uncollapse").addEventListener("click", () => {
    Array.from(document.querySelectorAll(".step3 .rules [data-fold-name]")).forEach((elm) => {
        elm.classList.remove("toggled");
    });
});

switchView("step1");

async function saveCmp(dom, exportJson = false) {
    let json = await DomParser.parseCmpDom(dom);

    let cmpName = document.querySelector(".step3 .cmpName input").value;

    let rules = {};
    rules[cmpName] = json;

    let jsonString = JSON.stringify(rules, null, 4);

    if (exportJson) {
        document.querySelector(".step4 pre").innerHTML = "";
        document.querySelector(".step4 pre").innerText = jsonString;

        switchView("step4");

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".step4 pre"));
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
    } else {

        chrome.runtime.sendMessage("AddCustomRule|" + jsonString);

        console.log("Saved into custom rules list");
    }
}

let caviDraggables = [];

function toggleClickHandler(evt) {
    if (evt.target.matches("[data-fold-name]")) {
        evt.target.classList.toggle("toggled");
        evt.stopPropagation();
    }
}

function setupDragging() {
    caviDraggables.forEach((draggable) => {
        draggable.destroy();
    });

    caviDraggables = [];

    setupDraggingForType("action");
    setupDraggingForType("domSelector");
    setupDraggingForType("detector");
    setupDraggingForType("consent");
    setupDraggingForType("matcher");

    document.querySelectorAll(".step3 .rules [data-fold-name]").forEach((elm) => {
        elm.removeEventListener("click", toggleClickHandler);
        elm.addEventListener("click", toggleClickHandler);
    });
}

function setupDraggingForType(type) {
    document.querySelectorAll(".step3 .rules [data-type='" + type + "']").forEach((element) => {
        caviDraggables.push(new CaviDraggable(element, {
            dropSelector: "[data-plug='" + type + "'], .trashcan",
            cloneClass: "draggable-clone",
            onDrop: (draggable, dropTarget, hoverElm) => {
                handleDrop(draggable, dropTarget, hoverElm, type);
            }
        }));
    });

    document.querySelectorAll(".step3 .toolbox [data-type='" + type + "']").forEach((element) => {
        caviDraggables.push(new CaviDraggable(element, {
            dropSelector: "[data-plug='" + type + "']",
            cloneClass: "draggable-clone",
            onDrop: async (draggable, dropTarget, hoverElm) => {
                let templateId = type;
                if (draggable.hasAttribute("data-variant")) {
                    templateId = type + "_" + draggable.getAttribute("data-variant");
                }
                let template = await loadTemplate(templateId);

                //Automatically fill all domSelectors
                for (let elm of Array.from(template.querySelectorAll("[data-plug='domSelector']:empty:not([data-bind='childFilter'])"))) {
                    let domSelectorTemplate = await loadTemplate("domSelector");
                    elm.appendChild(domSelectorTemplate);
                }

                //Automatically insert consent
                for (let elm of Array.from(template.querySelectorAll("[data-plug='consent']:empty"))) {
                    let consentTemplate = await loadTemplate("consent");
                    elm.appendChild(consentTemplate);
                }

                handleDrop(template, dropTarget, hoverElm, type);
            }
        }));
    });
}

async function handleDrop(draggable, dropTarget, hoverElm, type) {
    let insertElement = hoverElm;
    if (insertElement !== dropTarget) {
        while (insertElement != null && !insertElement.matches("[data-type='" + type + "']")) {
            insertElement = insertElement.parentNode;
            if (insertElement === dropTarget) {
                insertElement = null;
            }
        }
    }

    if (!insertElement.matches("[data-type='" + type + "']")) {
        insertElement = null;
    }

    if (dropTarget.matches(".trashcan")) {
        console.log("Deleting:", draggable);
        undoQueue.push({
            parent: draggable.parentNode,
            nextSibling: draggable.nextSibling,
            element: draggable
        });
        let savedParent = draggable.parentNode;
        draggable.parentNode.removeChild(draggable);
        console.log(savedParent, savedParent.childNodes);
        return;
    }

    if (!dropTarget.matches(":empty, [data-multiple='true']")) {
        console.log("There is no room here!");
        return;
    }

    if (ctrlPressed) {
        console.log("Making copy instead of moving!");
        let clone = draggable.cloneNode(true);
        let cloneSelects = Array.from(clone.querySelectorAll("select"));
        let origSelects = Array.from(draggable.querySelectorAll("select"));

        if (cloneSelects.length !== origSelects.length) {
            console.log("Something weird is happening!");
        } else {
            for (let i = 0; i < cloneSelects.length; i++) {
                cloneSelects[i].value = origSelects[i].value;
            }
        }

        draggable = clone;
    }

    undoQueue.push({
        parent: draggable.parentNode,
        nextSibling: draggable.nextSibling,
        element: draggable
    });

    if (dropTarget.matches("[data-multiple='true']") && insertElement != null) {
        let insertParent = insertElement.parentNode;

        let insertId = -1;
        let ourId = -1;
        let i = 0;
        for (let elm of Array.from(insertParent.children)) {
            if (insertElement == elm) {
                insertId = i;
            }
            if (draggable == elm) {
                ourId = i;
            }
            i++;
        }

        if (ourId == -1) {
            //We were not already inserted, insert right before insertElement
            insertParent.insertBefore(draggable, insertElement);
        } else {
            //We were already in the list somewhere
            if (ourId < insertId) {
                //Dragging down
                insertParent.insertBefore(draggable, insertElement.nextSibling);
            } else {
                //Dragging up
                insertParent.insertBefore(draggable, insertElement);
            }
        }

    } else {
        console.log("Inserting", draggable);

        //We are empty, or a multicontainer with no insertElement selected, just insert
        dropTarget.appendChild(draggable);

    }

    setupDragging();
}