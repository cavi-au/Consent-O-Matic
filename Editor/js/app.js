let cmpJson = null;

let usedNew = false;

let ctrlPressed = false;

let undoQueue = [];

document.addEventListener("keydown", (evt)=>{   
    if(evt.key === "Control") {
        ctrlPressed = true;
    }
});

document.addEventListener("keyup", (evt)=>{   
    if(evt.key === "Control") {
        ctrlPressed = false;
    }
    if(evt.key === "z" && ctrlPressed) {
        evt.preventDefault();

        let undoObj = undoQueue.pop();

        if(undoObj != null) {
            console.log("Undoing one step");

            if(undoObj.parent != null) {
                undoObj.parent.insertBefore(undoObj.element, undoObj.nextSibling);
            } else {
                cQuery(undoObj.element).remove();
            }
        } else {
            console.log("Undo queue empty");
        }
    }
});

new CaviTouch(cQuery(".loadButton"));
cQuery(".loadButton").on("caviTap", ()=>{
    usedNew = false;

    Loader.loadJson(cQuery("#loadUrl")[0].value).then((json)=>{
        loadFromJson(json);
    }).catch((e)=>{
        console.log("Failed to load from url:", e);
    });
});

new CaviTouch(cQuery(".loadTextButton"));
cQuery(".loadTextButton").on("caviTap", ()=>{
    try {
        let jsonString = cQuery("#inputArea")[0].value;
        let json = JSON.parse(jsonString);
        loadFromJson(json);
    } catch(e) {
        console.log("Unable to load from jsonString:", e);
    }
});

function loadFromJson(json) {
    cmpJson = json;

    cQuery("#cmpSelector").empty();
    Object.keys(cmpJson).forEach((key)=>{
        let option = cQuery("<option>"+key+"</option>");
        cQuery("#cmpSelector").append(option);
    });

    if(cQuery("#cmpSelector option").length === 1) {
        usedNew = true;
        //Only 1 option, skip ahead
        let event = new CustomEvent("caviTap");
        cQuery("#selectCmp")[0].dispatchEvent(event);
    } else {
        usedNew = false;
        cQuery("body")[0].setAttribute("data-view", "step2");
    }
}

new CaviTouch(cQuery(".newButton"));
cQuery(".newButton").on("caviTap", ()=>{
    usedNew = true;

    loadTemplate("cmp").then(async (cmpDom)=>{
        let open = await loadTemplate("method");
        open.find("[data-bind='name']")[0].textContent = "OPEN_OPTIONS";
        let consent = await loadTemplate("method");
        consent.find("[data-bind='name']")[0].textContent = "DO_CONSENT";
        let save = await loadTemplate("method");
        save.find("[data-bind='name']")[0].textContent = "SAVE_CONSENT";

        cmpDom.find("[data-plug='method']").append(open);
        cmpDom.find("[data-plug='method']").append(consent);
        cmpDom.find("[data-plug='method']").append(save);

        loadFromDom(cmpDom, "myCmp");
    });
});

new CaviTouch(cQuery("#selectCmp"));
cQuery("#selectCmp").on("caviTap", ()=>{
    let selectedKey = cQuery("#cmpSelector")[0].value;
    JsonParser.parseCmp(cmpJson[selectedKey]).then((cmpDom)=>{
        loadFromDom(cmpDom, selectedKey);
    });
});

function loadFromDom(cmpDom, name) {
    undoQueue = [];

    cQuery(".step3 .rules").empty();

    cQuery(".step3 .cmpName input")[0].value = name;

    let saveButton = cQuery(".step3 .save");
    new CaviTouch(saveButton);
    saveButton.off("caviTap");
    saveButton.on("caviTap", async ()=>{
        saveCmp(cmpDom);
    });

    cQuery(".step3 .rules").append(cmpDom);

    cQuery("body")[0].setAttribute("data-view", "step3");

    setupDragging();
}

new CaviTouch(cQuery(".step2 .back"));
cQuery(".step2 .back").on("caviTap", ()=>{
    cQuery("body")[0].setAttribute("data-view", "step1");
});

new CaviTouch(cQuery(".step3 .back"));
cQuery(".step3 .back").on("caviTap", ()=>{
    let shouldGoBack = confirm("You sure you want to go back? (Unsaved changes will be lost)");
    if(!shouldGoBack) {
        return;
    }

    if(usedNew) {
        cQuery("body")[0].setAttribute("data-view", "step1");
    } else {
        cQuery("body")[0].setAttribute("data-view", "step2");
    }
});

new CaviTouch(cQuery(".step4 .back"));
cQuery(".step4 .back").on("caviTap", ()=>{
    cQuery("body")[0].setAttribute("data-view", "step3");
});

new CaviTouch(cQuery(".step3 .collapse"));
cQuery(".step3 .collapse").on("caviTap", ()=>{
    cQuery(".step3 .rules [data-fold-name]").addClass("toggled");
});

new CaviTouch(cQuery(".step3 .uncollapse"));
cQuery(".step3 .uncollapse").on("caviTap", ()=>{
    cQuery(".step3 .rules [data-fold-name]").removeClass("toggled");
});

cQuery("body")[0].setAttribute("data-view", "step1");

async function saveCmp(dom) {
    let json = await DomParser.parseCmpDom(dom);

    let cmpName = cQuery(".step3 .cmpName input")[0].value;

    let rules = {};
    rules[cmpName] = json;

    let jsonString = JSON.stringify(rules, null, 4);

    cQuery(".step4 pre").empty();
    cQuery(".step4 pre")[0].innerText = jsonString;

    cQuery("body")[0].setAttribute("data-view", "step4");

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cQuery(".step4 pre")[0]);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
}

function setupDragging() {
    cQuery(".step3 .rules [data-fold-name]").forEach((elm)=>{
        new CaviTouch(elm, {
            preventDefaultEvents: [],
            stopPropagationEvents: []
        });
        cQuery(elm).off("caviTap");
        cQuery(elm).on("caviTap", (evt)=>{
            if(evt.detail.originalEvent.target.matches("[data-fold-name]")) {
                cQuery(elm).toggleClass("toggled");
            }
        });
    });

    cQuery("input").forEach((input)=>{
        new CaviTouch(input, {
            preventDefaultEvents: []
        });
    });

    setupDraggingForType("action");
    setupDraggingForType("domSelector");
    setupDraggingForType("detector");
    setupDraggingForType("consent");
    setupDraggingForType("matcher");
}

function setupDraggingForType(type) {
    cQuery(".step3 .rules [data-type='"+type+"']").forEach((element)=>{
        new CaviDraggable(cQuery(element), {
            dropSelector: "[data-plug='"+type+"'], .trashcan",
            cloneClass: "draggable-clone",
            onDrop: (draggable, dropTarget, hoverElm)=>{
                handleDrop(draggable, dropTarget, hoverElm, type);
            }
        });
    });

    cQuery(".step3 .toolbox [data-type='"+type+"']").forEach((element)=>{
        new CaviDraggable(cQuery(element), {
            dropSelector: "[data-plug='"+type+"']",
            cloneClass: "draggable-clone",
            onDrop: async (draggable, dropTarget, hoverElm)=>{
                let templateId = type;
                if(draggable[0].hasAttribute("data-variant")) {
                    templateId = type+"_"+draggable[0].getAttribute("data-variant");
                }
                let template = await loadTemplate(templateId);

                //Automatically fill all domSelectors
                for(let elm of template.find("[data-plug='domSelector']:empty:not([data-bind='childFilter'])")){
                    let domSelectorTemplate = await loadTemplate("domSelector");
                    cQuery(elm).append(domSelectorTemplate);
                }

                //Automatically insert consent
                for(let elm of template.find("[data-plug='consent']:empty")){
                    let consentTemplate = await loadTemplate("consent");
                    cQuery(elm).append(consentTemplate);
                }

                handleDrop(template, dropTarget, hoverElm, type);
            }
        });
    });
}

async function handleDrop(draggable, dropTarget, hoverElm, type) {
    dropTarget = cQuery(dropTarget[0]);

    let insertElement = cQuery(hoverElm);
    if(insertElement[0] !== dropTarget[0]){
        while(insertElement.length > 0 && !insertElement.is("[data-type='"+type+"']")) {
            insertElement = insertElement.parent();
            if(insertElement[0] === dropTarget[0]) {
                insertElement = [];
            }
        }
    }

    if(!insertElement.is("[data-type='"+type+"']")) {
        insertElement = [];
    }

    if(dropTarget.is(".trashcan")) {
        console.log("Deleting:", draggable);
        undoQueue.push({
            parent: draggable[0].parentNode,
            nextSibling: draggable[0].nextSibling,
            element: draggable[0]
        });
        draggable.remove();
        return;
    }

    if(!dropTarget.is(":empty, [data-multiple='true']")) {
        console.log("There is no room here!");
        return;
    }

    if(ctrlPressed) {
        console.log("Making copy instead of moving!");
        let clone = draggable.clone();
        let cloneSelects = clone.find("select");
        let origSelects = draggable.find("select");

        if(cloneSelects.length !== origSelects.length) {
            console.log("Something weird is happening!");
        } else {
            for(let i = 0; i<cloneSelects.length; i++) {
                cloneSelects[i].value = origSelects[i].value;
            }
        }

        draggable = clone;
    }

    undoQueue.push({
        parent: draggable[0].parentNode,
        nextSibling: draggable[0].nextSibling,
        element: draggable[0]
    });

    if(dropTarget.is("[data-multiple='true']") && insertElement.length > 0) {
        let insertParent = insertElement.parent();

        let insertId = -1;
        let ourId = -1;        
        let i = 0;
        for(let elm of insertParent.children()) {
            if(insertElement[0] == elm) {
                insertId = i;
            }
            if(draggable[0] == elm) {
                ourId = i;
            }
            i++;
        }

        if(ourId == -1) {
            //We were not already inserted, insert right before insertElement
            insertParent[0].insertBefore(draggable[0], insertElement[0]);
        } else {
            //We were already in the list somewhere
            if(ourId < insertId) {
                //Dragging down
                insertParent[0].insertBefore(draggable[0], insertElement[0].nextSibling);
            } else {
                //Dragging up
                insertParent[0].insertBefore(draggable[0], insertElement[0]);
            }
        }

    } else {
        //We are empty, or a multicontainer with no insertElement selected, just insert
        dropTarget.append(draggable);
    }

    setupDragging();
}