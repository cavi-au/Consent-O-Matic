class Telemetry {
    static send(msg) {
        console.log("Sending message: ", msg);
        fetch("https://gdprconsent.projects.cavi.au.dk/telemetry.php?msg="+encodeURIComponent(msg));
    }
}