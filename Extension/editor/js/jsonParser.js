class JsonParser {
    static async parseCmp(json) {
        return await JsonParser.loadTemplate("cmp", json);
    }

    static async loadTemplate(tplName, json) {
        let tpl = await loadTemplate(tplName);

        let plugs = Array.from(tpl.querySelectorAll("[data-plug]"));
        let valueBinds = Array.from(tpl.querySelectorAll("[data-bind]:not([data-plug])"));

        for (let plug of plugs) {
            let plugType = plug.getAttribute("data-plug");
            let bindName = plug.getAttribute("data-bind");

            await JsonParser.loadPlug(plug, plugType, bindName, json);
        }

        for (let valueBind of valueBinds) {
            let bindName = valueBind.getAttribute("data-bind");
            await JsonParser.loadBind(valueBind, bindName, json);
        }

        return tpl;
    }

    static async loadBind(valueBind, bindName, json) {
        let bindJson = json[bindName];

        if (bindJson != null) {
            if (valueBind.querySelector("ul")) {
                //List
                function insertListItem(value) {
                    let li = document.createElement("li");
                    let input = document.createElement("input");
                    input.setAttribute("size", 30);
                    input.value = value.trim();
                    valueBind.querySelector("ul").append(li);
                    li.appendChild(input);
                }

                valueBind.querySelector("ul").innerHTML = "";

                if (Array.isArray(bindJson)) {
                    bindJson.forEach((value) => {
                        insertListItem(value);
                    })
                } else {
                    insertListItem(bindJson);
                }
            } else if (valueBind.querySelector("input")) {
                //Setup value inside input
                let input = valueBind.querySelector("input");
                switch (input.getAttribute("type")) {
                    case "checkbox": {
                        input.checked = bindJson;
                        break;
                    }
                    default: {
                        if (Array.isArray(bindJson)) {
                            input.value = bindJson.join("|");
                        } else {
                            input.value = bindJson;
                        }
                    }
                }
            } else if (valueBind.querySelector("select")) {
                //Setup value inside select
                let select = valueBind.querySelector("select");
                select.value = bindJson;
            } else {
                //Setup value as string
                if (valueBind.parentNode.matches("[data-type='method']")) {
                    valueBind.setAttribute("data-bind-method-name", bindJson);

                    if(json.custom !== true) {
                        valueBind.textContent = Language.getString(bindJson);
                    } else {
                        valueBind.classList.add("customMethod");
                        valueBind.textContent = bindJson;
                    }
                } else {
                    valueBind.textContent = bindJson;
                }
            }
        }
    }

    static async loadPlug(plug, plugType, bindName, json) {
        let plugJson = json;

        if (bindName != null) {
            plugJson = json[bindName];
        }
        if (plugJson != null) {
            if (!(plugJson instanceof Array)) {
                plugJson = [plugJson];
            }

            for (let plugJsonEntry of plugJson) {
                let tplName = plugType;
                if (plugJsonEntry.type != null && tplName !== "domSelector" && tplName !== "consent") {
                    tplName += "_" + plugJsonEntry.type;
                }

                let tpl = await JsonParser.loadTemplate(tplName, plugJsonEntry);
                plug.appendChild(tpl);
            }
        } else {
            if (plugType === "domSelectorChild") {
                //Insert empty anyways
                let tpl = await JsonParser.loadTemplate("domSelectorChild", {});
                plug.appendChild(tpl);
            }
        }
    }
}
