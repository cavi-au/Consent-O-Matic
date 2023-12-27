chrome.tabs.query({
    active: true,
    currentWindow: true
}, (tabs) => {
    const hostname = new URL(tabs[0].url).hostname;

    let activeInput = document.querySelector(".siteselector input");
    document.querySelector("#site").textContent = hostname;
    document.querySelector("#unhandled_site").textContent = hostname;
    document.querySelector("#settings").addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
        window.close();
    });

    GDPRConfig.isActive(hostname).then((active) => {
        activeInput.checked = active;
    });
    activeInput.addEventListener("input", () => {
        GDPRConfig.setPageActive(hostname, activeInput.checked);
    });

    GDPRConfig.getDebugValues().then((settings) => {
        let confirmationInput = document.querySelector("#no-confirmation");
        confirmationInput.checked = (settings.skipSubmitConfirmation === true);

        confirmationInput.addEventListener("input", () => {
            settings.skipSubmitConfirmation = confirmationInput.checked;
            GDPRConfig.setDebugFlags(settings);
        });

        document.querySelector("#unhandled").addEventListener("click", () => {
            document.querySelector(".fronttab").style.display = "none";
            document.querySelector(".unhandledtab").style.display = "block";
            if (settings.skipSubmitConfirmation) {
                document.querySelector("#unhandled_send").click();
            }
        });
        document.querySelector("#unhandled_cancel").addEventListener("click", () => {
            document.querySelector(".unhandledtab").style.display = "none";
            document.querySelector(".fronttab").style.display = "block";
            window.close();
        });
        document.querySelector("#unhandled_send").addEventListener("click", () => {
            fetch("https://gdprconsent.projects.cavi.au.dk/report.php?url=" + encodeURIComponent(hostname));
            document.querySelector(".unhandledtab").style.display = "none";
            document.querySelector(".unhandledtab_complete").style.display = "block";
            setTimeout(() => {
                window.close();
            }, 1250);
        });
    });
});

window.addEventListener("DOMContentLoaded", () => {
    Language.doLanguage();
});
