class DomParser {
    static async parseDom(dom) {
        if(dom != null) {
            let result = {};

            let variant = dom.getAttribute("data-variant");
            let plugs = dom.querySelectorAll(":scope > [data-plug]");
            let bindValues = dom.querySelectorAll(":scope > [data-bind]:not([data-plug])");
    
            if(variant != null) {
                result.type = variant;
            }

            for(let plug of plugs) {
                await DomParser.parsePlug(plug, result);
            }
    
            for(let value of bindValues) {
                await DomParser.parseValue(value, result);
            }

            return result;
        }

        return null;
    }

    static async parsePlug(plugDom, json) {
        let plugType = plugDom.getAttribute("data-plug");
        let bindName = plugDom.getAttribute("data-bind");
        let multiple = !!plugDom.getAttribute("data-multiple");

        let result;

        if(multiple) {
            result = [];
            for(let dom of Array.from(plugDom.querySelectorAll(":scope > [data-type='"+plugType+"']"))) {
                result.push(await DomParser.parseDom(dom));
            }
        } else {
            let dom = plugDom.querySelector(":scope > [data-type='"+plugType+"']");
            result = await DomParser.parseDom(dom);
        }

        if(!isEmpty(result)) {
            if(bindName != null) {
                json[bindName] = result;
            } else {
                Object.assign(json, result);
            }
        }
    }

    static async parseValue(valueDom, json) {
        if(valueDom != null) {
            let bindName = valueDom.getAttribute("data-bind");
            let value;

            if(valueDom.querySelector("ul.list") != null) {
                console.log("LIST!");
                value = "";
                valueDom.querySelectorAll("ul.list input").forEach((input)=>{
                    let v = input.value.trim();
                    if(v.length > 0) {
                        value = value + "|" + v;
                    }
                });
            } else if(valueDom.querySelector("input") != null) {
                let input = valueDom.querySelector("input");
                switch(input.getAttribute("type")) {
                    case "checkbox":
                        value = input.checked;
                        break;
                    default:
                        value = input.value.trim();

                        if(input.getAttribute("type") === "number") {
                            value = +value;
                        }

                        break;
                }
            } else if(valueDom.querySelector("select") != null) {
                value = valueDom.querySelector("select").value;
            } else {
                console.log(valueDom);
                if(valueDom.getAttribute("data-bind-method-name")) {
                    value = valueDom.getAttribute("data-bind-method-name");
                } else {
                    value = valueDom.textContent;
                }
            }

			if(value != null && value !== "" && value !== false) {
				if(typeof(value) === "string" && value.indexOf("|") !== -1) {
					value = value.split("|").map((arrayValue)=>{
                        return arrayValue.trim();
                    }).filter((arrayValue)=>{
                        return arrayValue.length > 0;
                    });
				}
				
				json[bindName] = value;
			}
        }
    }
}

function isEmpty(obj) {
    if(obj == null) {
        return true;
    } else if(obj instanceof Array) {
        return obj.length === 0;
    } else {
        return Object.keys(obj).length === 0
    }
}