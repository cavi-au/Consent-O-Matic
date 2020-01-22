chrome.tabs.query({
    active: true,
    currentWindow: true
}, (tabs)=>{

    let url = tabs[0].url;
    url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));

    let activeInput = document.querySelector(".siteselector input");

    document.querySelector("#site").textContent = url;
    document.querySelector("#settings").addEventListener("click", function(){chrome.runtime.openOptionsPage()});

    GDPRConfig.isActive(url).then((active)=>{
        activeInput.checked = active;
    });

    activeInput.addEventListener("input", ()=>{
        GDPRConfig.setPageActive(url, activeInput.checked);
    });

    document.querySelector("#unhandled").addEventListener("click", ()=>{
	if (confirm('Submit '+url+' to our list of sites where autofill did not work?')) {
	    // Save it
            console.log("Sending report of unhandled CMP: ", url);
            fetch("https://gdprconsent.projects.cavi.au.dk/report.php?url="+encodeURIComponent(url));
            window.close();
	}
    });
});
