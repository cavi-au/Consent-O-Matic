const inputSelector = "input, [role='switch']"

class AutomaticDetector {
    static findTopParentWithOnlyOneInput(input) {
        let foundParent = null;
        let parent = input.parentNode;
    
        while(parent.querySelectorAll(inputSelector).length === 1) {
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
    
    static findPossibleCMPWithCategories() {
        let possibleCMPWithCategories = [];

        AutomaticDetector.getPossibleCMPItems().forEach((cmp)=>{
            let result = {
                cmp: cmp,
                categories: []
            };

            possibleCMPWithCategories.push(result);

            cmp.querySelectorAll(inputSelector).forEach((input)=>{
                let topParent = AutomaticDetector.findTopParentWithOnlyOneInput(input);
    
                if(topParent != null) {
                    result.categories.push(topParent);
                }
            });
        });

        return possibleCMPWithCategories;
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
        const self = this;
        
        let currentlySelected = {
            banner: null,
            button: null
        };

        let ui = await AutomaticDetector.fetchTemplate("#bannerUI-page1");

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

            function addButton(text, inputHandler) {
                let buttonLi = document.createElement("li");
                let buttonLabel = document.createElement("label");
                buttonLabel.textContent = text;

                let buttonInput = document.createElement("input");
                buttonInput.setAttribute("type", "radio");
                buttonInput.setAttribute("name", "possible-settings-button");

                buttonLi.appendChild(buttonLabel);

                buttonsUl.appendChild(buttonLi);
                buttonLabel.appendChild(buttonInput);

                buttonInput.addEventListener("input", ()=>{
                    inputHandler(buttonInput.checked);
                });
            }

            addButton("No Settings Button", ()=>{
                document.querySelectorAll(".ConsentOMatic-PossibleButton-Select").forEach((possibleButton)=>{
                    possibleButton.classList.remove("ConsentOMatic-PossibleButton-Select");
                });

                currentlySelected.button = null;
            });

            banner.buttons.forEach((button)=>{
                addButton(button.textContent, (checked)=>{
                    if(checked) {
                        document.querySelectorAll(".ConsentOMatic-PossibleButton-Select").forEach((possibleButton)=>{
                            possibleButton.classList.remove("ConsentOMatic-PossibleButton-Select");
                        });
    
                        button.classList.add("ConsentOMatic-PossibleButton-Select");

                        currentlySelected.button = button;
                    }
                });
            });

            input.addEventListener("input", ()=>{
                if(input.checked) {
                    document.querySelectorAll(".ConsentOMatic-PossibleBanner-Select").forEach((possibleBanner)=>{
                        possibleBanner.classList.remove("ConsentOMatic-PossibleBanner-Select");
                    });

                    ui.querySelectorAll(".banner").forEach((possibleBannerLi)=>{
                        possibleBannerLi.classList.remove("showButtons");
                    });

                    banner.bannerDom.classList.add("ConsentOMatic-PossibleBanner-Select");
                    bannerLi.classList.add("showButtons");

                    currentlySelected.banner = banner;
                }
            });

            ui.querySelector(".banners").appendChild(bannerLi);

            i++;
        }

        ui.querySelector(".next").addEventListener("click", ()=>{
            if(currentlySelected.button != null) {
                currentlySelected.button.click();
            }

            document.querySelectorAll(".ConsentOMatic-PossibleBanner-Select").forEach((possibleBanner)=>{
                possibleBanner.classList.remove("ConsentOMatic-PossibleBanner-Select");
            });

            ui.remove();
            self.showCategoryUI(currentlySelected);
        });
    }

    static async showCategoryUI(currentlySelected) {
        const self = this;

        let ui = await AutomaticDetector.fetchTemplate("#bannerUI-page2");

        let i = 1;
        for(let possibleCmpPopup of this.findPossibleCMPWithCategories()) {
            let li = document.createElement("li");
            li.classList.add("cmpWithCategory");

            let label = document.createElement("label");
            label.textContent = "Possible Category Popup "+i;

            let input = document.createElement("input");
            input.setAttribute("type", "radio");
            input.setAttribute("name", "possible-cmp-with-categories");

            input.addEventListener("input", ()=>{
                document.querySelectorAll(".ConsentOMatic-PossibleCMPPopup-Select").forEach((elm)=>{
                    elm.classList.remove("ConsentOMatic-PossibleCMPPopup-Select");
                });

                currentlySelected.categoryPopup = possibleCmpPopup.cmp;

                possibleCmpPopup.cmp.classList.add("ConsentOMatic-PossibleCMPPopup-Select");

                
                document.querySelectorAll(".ConsentOMatic-PossibleCategory-Select").forEach((elm)=>{
                    elm.classList.remove("ConsentOMatic-PossibleCategory-Select");
                });

                possibleCmpPopup.categories.forEach((category)=>{
                    category.classList.add("ConsentOMatic-PossibleCategory-Select");
                });
            });

            label.appendChild(input);

            li.appendChild(label);

            ui.querySelector(".cmps").appendChild(li);

            i++;
        }

        document.body.appendChild(ui);
    }
}