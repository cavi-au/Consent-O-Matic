/**
 * Consent-O-Manual: the "clicks saved" statistic.
 *
 *   clicks saved = clicks the user would have needed on the site's own banner
 *                - clicks the user made in Consent-O-Manual's popup        (never below 0)
 *
 * Clicks the user would have needed:
 *   - 1 if the outcome is "accept everything" / "reject everything" and the site's banner
 *     already showed a matching one-click button (e.g. its own "Reject all")
 *   - 1 if the banner was only hidden (dismissing it by hand takes a click)
 *   - otherwise the clicks Consent-O-Manual actually made (opening settings, toggles, save)
 *
 * Clicks the user made: buttons and checkboxes pressed in the unified popup; 0 when a saved
 * per-site choice or the global setting answered automatically.
 *
 * Example: the site has "Reject all", the user presses "Reject all non-essential" in our popup
 * → 1 - 1 = 0 clicks saved.
 */
export function computeClicksSaved({clicksMade, values, oneClick, actionMode, userClicks}) {
    const made = Math.max(0, Number(clicksMade) || 0);
    const pressed = Math.max(0, Number(userClicks) || 0);
    const buttons = oneClick || {accept: false, reject: false};

    let needed;
    if (actionMode === "hidden") {
        needed = 1;
    } else {
        let outcome = "partial";
        if (actionMode === "acceptAll" || actionMode === "rejectAll") {
            outcome = actionMode === "acceptAll" ? "accept" : "reject";
        } else if (values != null) {
            const all = Object.values(values);
            if (all.length > 0 && all.every((v)=>v === true)) outcome = "accept";
            else if (all.every((v)=>v !== true)) outcome = "reject";
        }

        if ((outcome === "accept" && buttons.accept) || (outcome === "reject" && buttons.reject)) {
            needed = 1;
        } else {
            needed = Math.max(made, 1);
        }
    }

    return Math.max(0, needed - pressed);
}
