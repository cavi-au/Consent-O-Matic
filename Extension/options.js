let optionsUL = document.querySelector(".configurator ul.categorylist");
let ruleUL = document.querySelector(".configurator .tab_rl .rulelist");
let debugUL = document.querySelector(".configurator .tab_dbg ul.flags");
let aboutTable = document.querySelector(".configurator .tab_about table.logList");

optionsUL.innerHTML = "";

document.querySelector(".header .menuitem.choices").addEventListener("click", function (evt) {
    tabChanged(this);
    document.querySelector(".tab_uc").style.display = "block";
});
document.querySelector(".header .menuitem.rules").addEventListener("click", function (evt) {
    tabChanged(this);
    document.querySelector(".tab_rl").style.display = "block";
});
document.querySelector(".header .menuitem.options").addEventListener("click", function (evt) {
    tabChanged(this);
    document.querySelector(".tab_options").style.display = "block";
});
document.querySelector(".header .menuitem.about").addEventListener("click", function (evt) {
    tabChanged(this);
    document.querySelector(".tab_about").style.display = "block";
    updateLog();
});
document.querySelector(".header .menuitem.debug").addEventListener("click", function (evt) {
    tabChanged(this);
    document.querySelector(".tab_dbg").style.display = "block";
});

GDPRConfig.getConsentTypes().then((consentTypes) => {
    consentTypes.forEach((consentType) => {
        addToggleItem(optionsUL, consentType.type, consentType.name, consentType.description, consentType.value).querySelector("input").addEventListener("input", function (evt) {
            if (this.checked) {
                this.parentNode.parentNode.classList.add("active");
            } else {
                this.parentNode.parentNode.classList.remove("active");
            }
            saveSettings();
        });
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

function addToggleItem(parent, type, name, description, isChecked) {
    let optionLI = document.createElement("li");


    const optionHtml = `
        <label class="slider" for="${type}">
                <input type="checkbox" id="${type}" ${isChecked ? "checked" : ""}>
                <div class="knob"></div>
        </label>
        <h2>${name}</h2>
        <div class="category_description">
${description}
		</div>`;

    let parser = new DOMParser();
    let parsed = parser.parseFromString(optionHtml, "text/html");
    let children = parsed.querySelector("body");

    for (let child of children.childNodes) {
        optionLI.appendChild(child);
    }

    parent.appendChild(optionLI);
    optionLI.addEventListener("click", function (evt) {
        this.querySelector("input").click();
        evt.stopPropagation();
    });
    return optionLI;
}

function updateRuleList() {
    GDPRConfig.getRuleLists().then((ruleLists) => {
        ruleUL.innerHTML = "";
        ruleLists.forEach((ruleList) => {
            let optionLI = document.createElement("li");
            let button = document.createElement("button");
            let link = document.createElement("span");
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
    document.querySelectorAll(".header .menuitem").forEach((item) => {
        item.classList.remove("active");
    });
    document.querySelectorAll(".tab").forEach((item) => {
        item.style.display = "none";
    });
    target.classList.add("active");
}

function saveSettings() {
    let consentValues = {};
    optionsUL.querySelectorAll("li input").forEach((input) => {
        consentValues[input.id] = input.checked;
    });
    GDPRConfig.setConsentValues(consentValues);

    GDPRConfig.setOptions();

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
