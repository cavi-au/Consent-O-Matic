let optionsUL = document.querySelector(".configurator ul.categorylist");
let ruleUL = document.querySelector(".configurator .tab_rl .rulelist");
let debugUL = document.querySelector(".configurator .tab_dbg ul.flags");
let logUL = document.querySelector(".configurator .tab_log ul.logList");

optionsUL.innerHTML = "";

document.querySelector(".header .menuitem.choices").addEventListener("click", function (evt) {
	tabChanged(this);
	document.querySelector(".tab_uc").style.display = "block";
});
document.querySelector(".header .menuitem.rules").addEventListener("click", function (evt) {
	tabChanged(this);
	document.querySelector(".tab_rl").style.display = "block";
});
document.querySelector(".header .menuitem.log").addEventListener("click", function (evt) {
	tabChanged(this);
	document.querySelector(".tab_log").style.display = "block";
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
                addToggleItem(debugUL, debugFlag.name, debugFlag.name, debugFlag.description, debugFlag.value).querySelector("input").addEventListener("input", function (evt) {
			if (this.checked) {
				this.parentNode.parentNode.classList.add("active");
			} else {
				this.parentNode.parentNode.classList.remove("active");
			}
			saveSettings();
		});
	});
});

function addToggleItem(parent, type, name, description, isChecked){
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

		for(let child of children.childNodes) {
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
				GDPRConfig.removeRuleList(ruleList).then(()=>{
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
	GDPRConfig.addRuleList(ruleList).then(()=>{
		updateRuleList();
	});
});

document.querySelector("#forceupdate").addEventListener("click", ()=>{
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
        
        let debugFlags = {};
        debugUL.querySelectorAll("li input").forEach((input) => {
		debugFlags[input.id] = input.checked;
	});
	GDPRConfig.setDebugFlags(debugFlags);
}

function updateLog() {
	logUL.innerHTML = "";
	GDPRConfig.getLogEntries().then((logEntries)=>{

		logEntries.sort((e1, e2)=>{
			return e2.timestamp - e1.timestamp;
		});

		logEntries.forEach((entry)=>{
			let li = document.createElement("li");
			
			li.innerText = new Date(entry.timestamp).toLocaleDateString(undefined, {
				dateStyle : "medium",
				timeStyle: "short"
				
			}) + " - ["+entry.cmp+"] - "+entry.page;

			logUL.append(li);
		})
	});
}

updateLog();

document.querySelector("#clearLog").addEventListener("click", ()=>{
	GDPRConfig.setLogEntries([]).then(()=>{
		updateLog();
	});
});

document.querySelector("#rulesEditor").addEventListener("click", ()=>{
	location.href = "/editor/index.html";
});

window.setInterval(function(){
    updateLog();
}, 5000);
