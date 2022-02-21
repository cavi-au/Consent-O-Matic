class AutomaticDetector {
    static findTopParentWithOnlyOneInput(input) {
        let foundParent = null;
        let parent = input.parentNode;
    
        while(parent.querySelectorAll("input").length === 1) {
            foundParent = parent;
            parent = parent.parentNode;
        }
    
        return foundParent;
    }
    
    static getPossibleCMPItems() {
        let potentialCMPs = [];
    
        document.querySelectorAll("*").forEach((elm)=>{
            if(elm.classList.contains("ConsentOMatic")) {
                return;
            }
            let styles = window.getComputedStyle(elm);
            if(styles.zIndex > 1000) {
                potentialCMPs.push(elm);
            }
        });
    
        return potentialCMPs;
    }
    
    static findPossibleBanners() {
        let possibleBanners = [];

        AutomaticDetector.getPossibleCMPItems().forEach((cmp)=>{
            let styles = window.getComputedStyle(cmp);
            if(styles.display !== "none") {
                let banner = {
                    "bannerDom": cmp,
                    "buttons": []
                };
                cmp.querySelectorAll("button, a").forEach((button)=>{
                    banner.buttons.push(button);
                });

                if(banner.buttons.length > 0) {
                    possibleBanners.push(banner);
                }
            }
        });

        return possibleBanners;
    }
    
    static findPossibleCategories() {
        let possibleCategories = [];

        AutomaticDetector.getPossibleCMPItems().forEach((cmp)=>{
            cmp.querySelectorAll("input").forEach((input)=>{
                let topParent = AutomaticDetector.findTopParentWithOnlyOneInput(input);
    
                if(topParent != null) {
                    possibleCategories.push(topParent);
                }
            });
        });

        return possibleCategories;
    }

    static async fetchTemplate(selector) {
        let url = chrome.runtime.getURL("auto.html");
        let html = await (await fetch(url)).text();
        let frag = document.createRange().createContextualFragment(html);

        let result = frag.querySelector(selector);

        if(result.content != null) {
            result = result.content;

            if(result.children.length === 1) {
                result = result.children[0];
            }
        }

        return result;
    }

    static async showBannerSelectorUI() {
        
        let currentlySelected = {
            banner: null,
            button: null
        };

        let ui = await AutomaticDetector.fetchTemplate("#bannerUI");

        document.body.appendChild(ui);

        let i = 1;
        for(let banner of AutomaticDetector.findPossibleBanners()) {
            let bannerLi = await AutomaticDetector.fetchTemplate("#bannerChild");

            let input = document.createElement("input");
            input.setAttribute("type", "radio");
            input.setAttribute("name", "possible-banner");
            input.banner = banner;

            let label = document.createElement("label");
            label.textContent = "Possible banner "+i;

            bannerLi.appendChild(label);
            label.appendChild(input);

            let buttonsUl = document.createElement("ul");
            buttonsUl.classList.add("possibleShowSettingsButtons");
            bannerLi.appendChild(buttonsUl);

            banner.buttons.forEach((button)=>{
                let buttonLi = document.createElement("li");
                let buttonLabel = document.createElement("label");
                buttonLabel.textContent = button.textContent;

                let buttonInput = document.createElement("input");
                buttonInput.setAttribute("type", "radio");
                buttonInput.setAttribute("name", "possible-settings-button");

                buttonLi.appendChild(buttonLabel);

                buttonsUl.appendChild(buttonLi);
                buttonLabel.appendChild(buttonInput);

                buttonInput.addEventListener("input", ()=>{
                    if(buttonInput.checked) {
                        document.querySelectorAll(".ConsentOMatic-PossibleButton-Select").forEach((possibleButton)=>{
                            possibleButton.classList.remove("ConsentOMatic-PossibleButton-Select");
                        });
    
                        button.classList.add("ConsentOMatic-PossibleButton-Select");

                        currentlySelected.button = button;
                    }
                })
            });

            input.addEventListener("input", ()=>{
                if(input.checked) {
                    document.querySelectorAll(".ConsentOMatic-PossibleBanner-Select").forEach((possibleBanner)=>{
                        possibleBanner.classList.remove("ConsentOMatic-PossibleBanner-Select");
                    });

                    banner.bannerDom.classList.add("ConsentOMatic-PossibleBanner-Select");
                    bannerLi.classList.add("showButtons");

                    currentlySelected.banner = banner;
                } else {
                    bannerLi.classList.remove("showButtons");
                }
            });

            ui.querySelector(".banners").appendChild(bannerLi);

            i++;
        }

        ui.querySelector(".next").addEventListener("click", ()=>{
            console.log(currentlySelected);
        });
    }
}