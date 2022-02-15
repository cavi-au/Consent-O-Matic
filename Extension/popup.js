chrome.tabs.query({
    active: true,
    currentWindow: true
}, (tabs)=>{
    let url = tabs[0].url;
    url = url.substring(url.indexOf("://")+3, url.indexOf("/", 8));

    let activeInput = document.querySelector(".siteselector input");
    document.querySelector("#site").textContent = url;
    document.querySelector("#unhandled_site").textContent = url;
    document.querySelector("#settings").addEventListener("click", function(){chrome.runtime.openOptionsPage()});

    GDPRConfig.isActive(url).then((active)=>{
        activeInput.checked = active;
    });

    activeInput.addEventListener("input", ()=>{
        GDPRConfig.setPageActive(url, activeInput.checked);
    });

    document.querySelector("#unhandled").addEventListener("click", ()=>{
	document.querySelector(".fronttab").style.display="none";
	document.querySelector(".unhandledtab").style.display="block";
    });
    document.querySelector("#unhandled_cancel").addEventListener("click", ()=>{
	document.querySelector(".unhandledtab").style.display="none";
	document.querySelector(".fronttab").style.display="block";
        window.close();
    });
    document.querySelector("#unhandled_send").addEventListener("click", ()=>{
        fetch("https://gdprconsent.projects.cavi.au.dk/report.php?url="+encodeURIComponent(url));
	document.querySelector(".unhandledtab").style.display="none";
	document.querySelector(".unhandledtab_complete").style.display="block";
	setTimeout(()=>{
            window.close();
	},1250);
    });

});
