{
    "$schema": "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules.schema.json",
    "Dailymotion.com": {
        "detectors": [
            {
                "presentMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": ".Overlay__containerActive___2te0I [aria-label~=privacy], .TCF2ConsentPage__container___1VslO"
                        }
                    }
                ],
                "showingMatcher": [
                    {
                        "type": "css",
                        "target": {
                            "selector": ".Overlay__containerActive___2te0I [aria-label~=privacy], .TCF2ConsentPage__container___1VslO",
                            "displayFilter": true
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
                "action": {
                    "type": "click",
                    "target": {
                        "selector": ".TCF2Popup__personalize___NeAe-"
                    }
                },
                "name": "OPEN_OPTIONS"
            },
            {
                "action": {
                    "type": "list",
                    "actions": [
                        {
                            "type": "ifcss",
                            "target": {
                                "selector": ".TCF2ConsentPage__container___1VslO"
                            },
                            "trueAction": {
                                "type": "list",
                                "actions": [
                                    {
                                        "type": "click",
                                        "target": {
                                            "childFilter": {
                                                "target": {
                                                    "selector": "span",
                                                    "textFilter": [
                                                        "Accept all"
                                                    ]
                                                }
                                            },
                                            "selector": ".Button__button___3e-04.TCF2ConsentPage__button___1epOp"
                                        }
                                    },
                                    {
                                        "type": "foreach",
                                        "target": {
                                            "selector": "li div.TCF2Purpose__container___Yf5Lb"
                                        },
                                        "action": {
                                            "type": "list",
                                            "actions": [
                                                {
                                                    "type": "ifcss",
                                                    "target": {
                                                        "selector": ".TCF2Purpose__name___1-X7e",
                                                        "textFilter": [
                                                            "Store and/or access information on a device"
                                                        ]
                                                    },
                                                    "trueAction": {
                                                        "type": "consent",
                                                        "consents": [
                                                            {
                                                                "matcher": {
                                                                    "type": "css",
                                                                    "target": {
                                                                        "selector": "span",
                                                                        "textFilter": [
                                                                            "On"
                                                                        ]
                                                                    },
                                                                    "parent": {
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "trueAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "On"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "falseAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "Off"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "type": "D"
                                                            }
                                                        ]
                                                    }
                                                },
                                                {
                                                    "type": "ifcss",
                                                    "target": {
                                                        "selector": ".TCF2Purpose__name___1-X7e",
                                                        "textFilter": [
                                                            "Select basic ads",
                                                            "Create a personalised ads profile",
                                                            "Select personalised ads",
                                                            "Measure ad performance"
                                                        ]
                                                    },
                                                    "trueAction": {
                                                        "type": "consent",
                                                        "consents": [
                                                            {
                                                                "matcher": {
                                                                    "type": "css",
                                                                    "target": {
                                                                        "selector": "span",
                                                                        "textFilter": [
                                                                            "On"
                                                                        ]
                                                                    },
                                                                    "parent": {
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "trueAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "On"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "falseAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "Off"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "type": "F"
                                                            }
                                                        ]
                                                    }
                                                },
                                                {
                                                    "type": "ifcss",
                                                    "target": {
                                                        "selector": ".TCF2Purpose__name___1-X7e",
                                                        "textFilter": [
                                                            "Create a personalised content profile",
                                                            "Select personalised content"
                                                        ]
                                                    },
                                                    "trueAction": {
                                                        "type": "consent",
                                                        "consents": [
                                                            {
                                                                "matcher": {
                                                                    "type": "css",
                                                                    "target": {
                                                                        "selector": "span",
                                                                        "textFilter": [
                                                                            "On"
                                                                        ]
                                                                    },
                                                                    "parent": {
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "trueAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "On"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "falseAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "Off"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "type": "E"
                                                            }
                                                        ]
                                                    }
                                                },
                                                {
                                                    "type": "ifcss",
                                                    "target": {
                                                        "selector": ".TCF2Purpose__name___1-X7e",
                                                        "textFilter": [
                                                            "Measure content performance",
                                                            "Apply market research to generate audience insights",
                                                            "Actively scan device characteristics for identification"
                                                        ]
                                                    },
                                                    "trueAction": {
                                                        "type": "consent",
                                                        "consents": [
                                                            {
                                                                "matcher": {
                                                                    "type": "css",
                                                                    "target": {
                                                                        "selector": "span",
                                                                        "textFilter": [
                                                                            "On"
                                                                        ]
                                                                    },
                                                                    "parent": {
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "trueAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "On"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "falseAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "Off"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "type": "B"
                                                            }
                                                        ]
                                                    }
                                                },
                                                {
                                                    "type": "ifcss",
                                                    "target": {
                                                        "selector": ".TCF2Purpose__name___1-X7e",
                                                        "textFilter": [
                                                            "Use precise geolocation data",
                                                            "Develop and improve products"
                                                        ]
                                                    },
                                                    "trueAction": {
                                                        "type": "consent",
                                                        "consents": [
                                                            {
                                                                "matcher": {
                                                                    "type": "css",
                                                                    "target": {
                                                                        "selector": "span",
                                                                        "textFilter": [
                                                                            "On"
                                                                        ]
                                                                    },
                                                                    "parent": {
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "trueAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "On"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "falseAction": {
                                                                    "type": "click",
                                                                    "target": {
                                                                        "childFilter": {
                                                                            "target": {
                                                                                "selector": "span",
                                                                                "textFilter": [
                                                                                    "Off"
                                                                                ]
                                                                            }
                                                                        },
                                                                        "selector": ".Button__button___3e-04.SwitchButtons__button___14Shq"
                                                                    }
                                                                },
                                                                "type": "X"
                                                            }
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                },
                "name": "DO_CONSENT"
            },
            {
                "action": {
                    "type": "list",
                    "actions": [
                        {
                            "type": "click",
                            "target": {
                                "selector": ".TCF2ConsentPage__saveButton___56I8A"
                            }
                        },
                        {
                            "type": "close"
                        }
                    ]
                },
                "name": "SAVE_CONSENT"
            },
            {
                "name": "UTILITY"
            }
        ]
    }
}