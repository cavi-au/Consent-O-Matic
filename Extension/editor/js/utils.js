/**
 * Replaces the given node with a clone of the node, effectively clearing all event listeners.
 * @param {HTMLElement} node 
 */
function replaceNodeWithClone(node) {
    let clone = node.cloneNode(true);
    node.parentNode.replaceChild(clone, node);
    return clone;
}

async function loadTemplate(id) {
    let response = await fetch("./templates.html");
    let text = await response.text();

    let parser = new DOMParser();
    let dom = parser.parseFromString(text, "text/html");

    let fragment = document.importNode(dom.querySelector("#"+id).content, true);

    let newFragment = document.createDocumentFragment();

    let i = 0;

    Array.from(fragment.children).forEach((child)=>{
        newFragment.appendChild(child);
        i++;
    });

    if(i > 1) {
        console.error("More than 1 child!");
    }

    Language.doAttributes(newFragment);
    Language.doLanguage(newFragment);

    return newFragment.children[0];
}

async function fetchJson(url) {
    let response = await fetch(url);
    let json = await response.json();
    return json;
}

function switchView(step) {
    document.querySelector("body").setAttribute("data-view", step);
}
