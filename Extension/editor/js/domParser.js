class DomParser {
    static async parseDom(dom) {
        console.log("Parsing DOM:", dom);

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

        console.log("Parsing Plug:", plugDom, plugType, multiple, json);

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
        console.log("Parsing Value:", valueDom, json);

        if(valueDom != null) {
            let bindName = valueDom.getAttribute("data-bind");
            let value;

            if(valueDom.querySelector("input") != null) {
                let input = valueDom.querySelector("input");
                switch(input.getAttribute("type")) {
                    case "checkbox":
                        value = input.checked;
                        break;
                    default:
                        value = input.value;
                        break;
                }
            } else if(valueDom.querySelector("select") != null) {
                value = valueDom.querySelector("select").value;
            } else {
                value = valueDom.textContent;
            }

			if(value != null && value !== "" && value !== false) {
				if(value.indexOf("|") !== -1) {
					value = value.split("|");
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