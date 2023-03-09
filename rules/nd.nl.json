{
    "$schema": "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules.schema.json",
    "nd.nl": {
        "detectors": [
            {
                "presentMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": "#cookieconsent.cookie-banner"
                        }
                    }
                ],
                "showingMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": "#cookieconsent.cookie-banner",
                            "displayFilter": true
                        }
                    }
                ]
            }
        ],
        "methods": [
            {
                "action": {
                    "type": "list",
                    "actions": [
                        {
                            "type": "hide",
                            "target": {
                                "selector": "#cookieconsent"
                            }
                        },
                        {
                            "type": "hide",
                            "target": {
                                "selector": ".cookie-banner__inner"
                            }
                        }
                    ]
                },
                "name": "HIDE_CMP"
            },
            {
                "action": {
                    "type": "click",
                    "target": {
                        "selector": ".cookie-banner__inner__content__toolbar__settings"
                    }
                },
                "name": "OPEN_OPTIONS"
            },
            {
                "action": {
                    "type": "list",
                    "actions": [
                        {
                            "type": "consent",
                            "consents": [
                                {
                                    "matcher": {
                                        "type": "checkbox",
                                        "target": {
                                            "selector": "#consent-analytics"
                                        }
                                    },
                                    "toggleAction": {
                                        "type": "click",
                                        "target": {
                                            "selector": "#consent-analytics"
                                        }
                                    },
                                    "type": "B"
                                }
                            ]
                        },
                        {
                            "type": "consent",
                            "consents": [
                                {
                                    "matcher": {
                                        "type": "checkbox",
                                        "target": {
                                            "selector": "#consent-socialmedia"
                                        }
                                    },
                                    "toggleAction": {
                                        "type": "click",
                                        "target": {
                                            "selector": "#consent-socialmedia"
                                        }
                                    },
                                    "type": "X"
                                }
                            ]
                        },
                        {
                            "type": "consent",
                            "consents": [
                                {
                                    "matcher": {
                                        "type": "checkbox",
                                        "target": {
                                            "selector": "#consent-advertisements"
                                        }
                                    },
                                    "toggleAction": {
                                        "type": "click",
                                        "target": {
                                            "selector": "#consent-advertisements"
                                        }
                                    },
                                    "type": "F"
                                }
                            ]
                        }
                    ]
                },
                "name": "DO_CONSENT"
            },
            {
                "action": {
                    "type": "click",
                    "target": {
                        "selector": ".cookie-banner__inner__content__settings__save"
                    }
                },
                "name": "SAVE_CONSENT"
            },
            {
                "name": "UTILITY"
            }
        ]
    }
}
