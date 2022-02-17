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
                possibleBanners.push(banner);
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
        
        let ui = await AutomaticDetector.fetchTemplate("#bannerUI");

        document.body.append(ui);

        for(let banner of AutomaticDetector.findPossibleBanners()) {
            let bannerLi = AutomaticDetector.fetchTemplate("#bannerChild");
            bannerLi.querySelector(".name").textContent = banner.bannerDom.

            ui.querySelector(".banners").appendChild(bannerLi);
        }
    }
}