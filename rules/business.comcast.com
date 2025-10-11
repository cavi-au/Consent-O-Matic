{
    "$schema": "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules.schema.json",
    "business.comcast.com": {
        "detectors": [
            {
                "presentMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": ".cc-window.cc-banner"
                        }
                    }
                ],
                "showingMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": ".cc-window.cc-banner"
                        }
                    }
                ]
            }
        ],
        "methods": [
            {
                "name": "HIDE_CMP"
            },
            {
                "name": "OPEN_OPTIONS"
            },
            {
                "action": {
                    "type": "ifallowall",
                    "trueAction": {
                        "type": "click",
                        "target": {
                            "selector": ".cc-btn.cc-allow"
                        }
                    },
                    "falseAction": {
                        "type": "click",
                        "target": {
                            "selector": ".cc-btn.cc-dismiss"
                        }
                    }
                },
                "name": "DO_CONSENT"
            },
            {
                "name": "SAVE_CONSENT"
            },
            {
                "name": "UTILITY"
            }
        ]
    }
}
