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

document.addEventListener("blur", (evt)=>{
    if (!evt.target.closest) return;
    let list = evt.target.closest("ul.list");

    if(list != null && evt.target.matches("input")) {
        if(evt.target.value.trim().length === 0) {
            evt.target.remove();
        }
    }
})

document.addEventListener("keyup", (evt) => {
    if (evt.key === "Control") {
        ctrlPressed = false;
    }
    if (evt.key === "z" && ctrlPressed) {
        evt.preventDefault();

        let undoObj = undoQueue.pop();

        if (undoObj != null) {
            if (undoObj.parent != null) {
                undoObj.parent.insertBefore(undoObj.element, undoObj.nextSibling);
            } else {
                undoObj.element.parentNode.removeChild(undoObj.element);
            }
        }
    }    
    if(evt.key === "Enter") {
        let list = evt.target.closest("ul.list");
        if(list != null) {
            let li = document.createElement("li");
            let input = document.createElement("input");
            input.setAttribute("size", 30);
            li.appendChild(input);
            list.appendChild(li);
            input.focus();
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

        delete json["$schema"];

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

        delete condensedJson["$schema"];

        cmpJson = condensedJson;

        loadFromJson(condensedJson, document.querySelector("#knownRules"));
    });

    chrome.runtime.sendMessage("GetCustomRuleList", (customRules) => {
        delete customRules["$schema"];
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
        hide.querySelector("[data-bind='name']").textContent = Language.getString("HIDE_CMP");
        hide.querySelector("[data-bind='name']").setAttribute("data-bind-method-name", "HIDE_CMP");
        let open = await loadTemplate("method");
        open.querySelector("[data-bind='name']").textContent = Language.getString("OPEN_OPTIONS");
        open.querySelector("[data-bind='name']").setAttribute("data-bind-method-name", "OPEN_OPTIONS");
        let consent = await loadTemplate("method");
        consent.querySelector("[data-bind='name']").textContent = Language.getString("DO_CONSENT");
        consent.querySelector("[data-bind='name']").setAttribute("data-bind-method-name", "DO_CONSENT");
        let save = await loadTemplate("method");
        save.querySelector("[data-bind='name']").textContent = Language.getString("SAVE_CONSENT");
        save.querySelector("[data-bind='name']").setAttribute("data-bind-method-name", "SAVE_CONSENT");

        let utility = await loadTemplate("method");
        utility.querySelector("[data-bind='name']").textContent = Language.getString("UTILITY");
        utility.querySelector("[data-bind='name']").setAttribute("data-bind-method-name", "UTILITY");

        cmpDom.querySelector("[data-plug='method']").appendChild(hide);
        cmpDom.querySelector("[data-plug='method']").appendChild(open);
        cmpDom.querySelector("[data-plug='method']").appendChild(consent);
        cmpDom.querySelector("[data-plug='method']").appendChild(save);
        cmpDom.querySelector("[data-plug='method']").appendChild(utility);

        loadFromDom(cmpDom, Language.getString("MY_CMP"));
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
        return elm.name === "UTILITY";
    }) == null) {
        json.methods.push({
            "name": "UTILITY",
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

    document.addEventListener("keydown", (evt) => {
        if (ctrlPressed && evt.key === "s") {
            evt.preventDefault();
            saveCmp(cmpDom);
        };
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
    let json = await DomParser.parseDom(dom);

    let cmpName = document.querySelector(".step3 .cmpName input").value;

    let rules = {};
    rules["$schema"] = "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules.schema.json";
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
    }
}

let caviDraggables = [];

function toggleClickHandler(evt) {
    if (evt.target.matches("[data-fold-name]")) {
        evt.target.classList.toggle("toggled");
    }
}

document.addEventListener("click", toggleClickHandler);

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

                //Automatically fill all domSelectorChilds
                for (let elm of Array.from(template.querySelectorAll("[data-plug='domSelectorChild']:empty"))) {
                    let domSelectorChildTemplate = await loadTemplate("domSelectorChild");
                    elm.appendChild(domSelectorChildTemplate);
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
    function cloneClickHandler(evt) {
        evt.stopImmediatePropagation();
    }

    document.addEventListener("click", cloneClickHandler, {
        "capture": true,
        "once": true
    });

    setTimeout(()=>{
        try {
            document.removeEventListener("click", cloneClickHandler, {
                "capture": true,
                "once": true
            });
        } catch(e) {
            console.warn(e);
        }
    }, 0);
    
    let insertElement = hoverElm;
    if (insertElement !== dropTarget) {
        while (insertElement != null && !insertElement.matches("[data-type='" + type + "']")) {
            insertElement = insertElement.parentNode;
        }
    }

    if (insertElement === dropTarget) {
        insertElement = null;
    }

    if (insertElement != null && !insertElement.matches("[data-type='" + type + "']")) {
        insertElement = null;
    }

    if (dropTarget.matches(".trashcan")) {
        undoQueue.push({
            parent: draggable.parentNode,
            nextSibling: draggable.nextSibling,
            element: draggable
        });
        let savedParent = draggable.parentNode;
        draggable.parentNode.removeChild(draggable);
        return;
    }

    if (!dropTarget.matches(":empty, [data-multiple='true']")) {
        return;
    }

    if (ctrlPressed) {
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
        //We are empty, or a multicontainer with no insertElement selected, just insert
        dropTarget.appendChild(draggable);

    }

    setupDragging();
}

function combineRules() {
    chrome.runtime.sendMessage("GetRuleList", (fetchedRules) => {
        chrome.runtime.sendMessage("GetCustomRuleList", (customRules) => {
            // Concat rule-lists to engine config in order
            let config = Object.assign({}, ...fetchedRules, customRules);

            copyToClipboard(JSON.stringify(config, null, 2));
        });
    });
}

function copyToClipboard(str) {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};

function updateTitles() {
    document.querySelectorAll("div[data-fold-name]").forEach((div)=>{
        let extraFoldName = "";

        let consents = div.querySelectorAll("[data-type='consent']");

        if(consents.length === 1) {
            let select = consents[0].querySelector("[data-bind='type'] select");
            let text = select.querySelector("[value='"+select.value+"'").textContent;

            extraFoldName = " - "+text;
        }

        div.setAttribute("data-fold-extra-name", extraFoldName);
    });
}

let observer = new MutationObserver((mutations)=>{
    updateTitles();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener("input", ()=>{
    updateTitles();
});

document.querySelector("button.addmethod").addEventListener("click", async ()=>{
    let promptMsg = Language.getString("ADD_METHOD_PROMPT");
    let methodName = window.prompt(promptMsg);

    if(methodName != null) {
        methodName = methodName.toUpperCase();

        let methodDom = await JsonParser.loadTemplate("method", {
            "name": methodName,
            "custom": true
        });

        document.querySelector("[data-type='cmp'] > [data-plug='method']").appendChild(methodDom);
    }
});

window.addEventListener("DOMContentLoaded", ()=>{
    Language.doLanguage();
});
