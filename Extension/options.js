let optionsUL = document.querySelector(".configurator ul.categorylist");
let ruleUL = document.querySelector(".configurator .tab_rl .rulelist");
let debugUL = document.querySelector(".configurator .tab_dbg ul.flags");
let aboutTable = document.querySelector(".configurator .tab_about table.logList");

optionsUL.innerHTML = "";

let menuTabs = document.querySelectorAll(".header .menuitem")

menuTabs.forEach((menuTab) => {
    menuTab.addEventListener("click", (evt)=>{
        tabChanged(menuTab);
    });

    menuTab.addEventListener("keydown", (evt)=> {
        console.log(evt.code);

        let newTab = null;

        if(evt.code === "ArrowRight") {
            newTab = menuTab.nextElementSibling;
            if(newTab == null) {
                newTab = menuTabs[0];
            }
        } else if(evt.code === "ArrowLeft") {
            newTab = menuTab.previousElementSibling;
            if(newTab == null) {
                newTab = menuTabs[menuTabs.length - 1];
            }
        }
        if(newTab != null) {
            tabChanged(newTab);
        }
    });
});

GDPRConfig.getGeneralSettings().then((generalSettings)=>{
    let hideOrPipForm = document.querySelector("#generalTab #hideOrPip");
    let hideOrPipRadioGroup = hideOrPipForm.elements["hideOrPip"];
    if(generalSettings.hideInsteadOfPIP) {
        hideOrPipRadioGroup.value = "hide";
    } else {
        hideOrPipRadioGroup.value = "pip";
    }

    function saveGeneralSettings() {
        const newGeneralSettings = {
            hideInsteadOfPIP: hideOrPipRadioGroup.value === "hide"
        };

        GDPRConfig.setGeneralSettings(newGeneralSettings);
    }

    hideOrPipForm.addEventListener("input", ()=>{
        saveGeneralSettings();
    });
});

GDPRConfig.getConsentTypes().then((consentTypes) => {
    consentTypes.forEach((consentType) => {
        addToggleItem(optionsUL, consentType.type, consentType.name, consentType.description, consentType.value);
    });
});

GDPRConfig.getDebugFlags().then((debugFlags) => {
    debugFlags.forEach((debugFlag) => {
        let optionLi = addToggleItem(debugUL, debugFlag.name, debugFlag.name, debugFlag.description, debugFlag.value);
		let input = optionLi.querySelector("input");
		input.addEventListener("input", function (evt) {
            if (this.checked) {
                this.parentNode.parentNode.classList.add("active");
            } else {
                this.parentNode.parentNode.classList.remove("active");
            }
            saveSettings();
        });

		if(input.checked) {
			optionLi.classList.add("active");
		}
    });
});

document.querySelector("#clearDebugFlags").addEventListener("click", ()=>{
    GDPRConfig.setDebugFlags({}).then(()=>{
        GDPRConfig.getDebugFlags().then((debugFlags)=>{
            debugFlags.forEach((debugFlag)=>{
                let optionLi = document.querySelector("ul.flags li[data-name='"+debugFlag.name+"']");
                let input = optionLi.querySelector("input");
                input.checked = debugFlag.value;
                if(!debugFlag.value) {
                    optionLi.classList.remove("active");
                }
            });
        });
    })
})

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function addToggleItem(parent, type, name, description, isChecked) {
    let optionLI = document.createElement("li");
    optionLI.setAttribute("data-name", name);

    let uuid = uuidv4();

    const optionHtml = `
        <label class="slider" for="${type}">
                <input type="checkbox" id="${type}" ${isChecked ? "checked" : ""}>
                <div class="knob" role="checkbox" aria-checked="${isChecked ? "true" : "false"}" tabindex="0" aria-labelledby="${uuid}"></div>
        </label>
        <h2 id=${uuid}>${name}</h2>
        <div class="category_description">
${description}
		</div>`;

    let parser = new DOMParser();
    let parsed = parser.parseFromString(optionHtml, "text/html");
    let children = parsed.querySelector("body");

    for (let child of children.childNodes) {
        optionLI.appendChild(child);
    }

    function toggleInput() {
        let input = optionLI.querySelector("input");
        input.checked = !input.checked;
        optionLI.querySelector(".knob").setAttribute("aria-checked", ""+input.checked);
        if (input.checked) {
            optionLI.classList.add("active");
        } else {
            optionLI.classList.remove("active");
        }
        saveSettings();
    }

    parent.appendChild(optionLI);
    optionLI.addEventListener("click", function (evt) {
        toggleInput();
        evt.stopPropagation();
    });
    optionLI.addEventListener("keydown", function (evt) {
        if(evt.code === "Space") {
            toggleInput();
            evt.stopPropagation();
        }
    });
    return optionLI;
}

function updateRuleList() {
    GDPRConfig.getRuleLists().then((ruleLists) => {
        ruleUL.innerHTML = "";
        ruleLists.forEach((ruleList) => {
            let optionLI = document.createElement("li");
            let button = document.createElement("button");
            let link = document.createElement("a");
            link.href = ruleList;
            link.innerText = ruleList;
            button.innerText = "X";
            optionLI.appendChild(button);
            optionLI.appendChild(link);
            ruleUL.appendChild(optionLI);

            button.addEventListener("click", function () {
                GDPRConfig.removeRuleList(ruleList).then(() => {
                    updateRuleList();
                });
            });
        });
    });
}

updateRuleList();

document.querySelector("#urladd").addEventListener("click", function (evt) {
    let ruleList = document.querySelector("#newurl").value;
    document.querySelector("#newurl").value = "";
    GDPRConfig.addRuleList(ruleList).then(() => {
        updateRuleList();
    });
});

document.querySelector("#forceupdate").addEventListener("click", () => {
    GDPRConfig.clearRuleCache();
});

function tabChanged(target) {
    let oldTab = document.querySelector(".header .menuitem[tabindex='0']");
    if(oldTab != null) {
        oldTab.setAttribute("tabindex", -1);
    }

    menuTabs.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", false);
    });
    document.querySelectorAll(".tab").forEach((item) => {
        item.style.display = "none";
    });
    target.classList.add("active");
    target.setAttribute("aria-selected", true);
    target.setAttribute("tabindex", 0);

    document.querySelectorAll(".configurator .tab").forEach((tab)=>{
        tab.style.display = "none";
    });

    document.getElementById(target.getAttribute("aria-controls")).style.display = "block";

    target.focus();

    updateLog();
}

function saveSettings() {
    let consentValues = {};
    optionsUL.querySelectorAll("li input").forEach((input) => {
        consentValues[input.id] = input.checked;
    });
    GDPRConfig.setConsentValues(consentValues);

    let debugFlags = {};
    debugUL.querySelectorAll("li input").forEach((input) => {
        debugFlags[input.id] = input.checked;
    });
    GDPRConfig.setDebugFlags(debugFlags);
}

function updateLog() {
    aboutTable.querySelectorAll("tr:not(:first-child)").forEach((el) => {
        el.remove();
    });
    GDPRConfig.getStatistics().then((entries) => {
        document.querySelector("#clicks").innerText = entries.clicks;

        for (const [cmp, stats] of Object.entries(entries.cmps)) {
            let tr = document.createElement("tr");
            let cell = document.createElement("th");
            cell.innerText = cmp;
            tr.appendChild(cell);
            cell = document.createElement("td");
            cell.innerText = stats.filledForms;
            tr.appendChild(cell);
            cell = document.createElement("td");
            cell.innerText = stats.clicks;
            tr.appendChild(cell);
            aboutTable.append(tr);
        }
    });
}


document.querySelector("#clearLog").addEventListener("click", () => {
    GDPRConfig.setStatistics({
        clicks: 0,
        cmps: {}
    }).then(() => {
        updateLog();
    });
});

document.querySelector("#rulesEditor").addEventListener("click", () => {
    location.href = "/editor/index.html";
});

window.addEventListener("DOMContentLoaded", ()=>{
    Language.doLanguage();
});
