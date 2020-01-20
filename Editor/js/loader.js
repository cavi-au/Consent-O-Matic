class Loader {
    static async loadJson(url) {
        console.log("Loading: ", url);
        let response = await fetch(url);
        let json = await response.json();

        return json;
    }
}
