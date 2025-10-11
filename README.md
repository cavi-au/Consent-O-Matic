# Consent-O-Matic

<table><tr><td>
   <picture>
     <source srcset="Extension/logo.svg" width="150" media="(width >= 710px)">
     <img src="Extension/logo.svg" width="550" alt="">
   </picture>
</td><td>
   <div>
      <a href="https://chromewebstore.google.com/detail/consent-o-matic/mdjildafknihdffpkfmmpnpoiajfjnjd">
         <picture>
            <source srcset="https://i.imgur.com/XBIE9pk.png" height="60" media="(width >= 710px)">
            <img src="https://i.imgur.com/XBIE9pk.png" width="56%" alt="Chrome Web Store (also for Chromium-based browsers)">
         </picture>
      </a>
      <a href="https://addons.mozilla.org/en-US/firefox/addon/consent-o-matic/">
         <picture>
            <source srcset="https://i.imgur.com/ZluoP7T.png" height="60" media="(width >= 710px)">
            <img src="https://i.imgur.com/ZluoP7T.png" width="41%" alt="Firefox add-ons">
         </picture>
      </a>
   </div>
   <div>
      <a href="https://apps.apple.com/us/app/consent-o-matic/id1606897889">
         <picture>
            <source srcset="https://i.imgur.com/LC92P1Y.png" height="60" media="(width >= 710px)">
            <img src="https://i.imgur.com/LC92P1Y.png" width="56%" alt="Mac App Store for Safari on iOS and macOS">
         </picture>
      </a>
      <a href="https://microsoftedge.microsoft.com/addons/detail/consentomatic/eflcfflijdiekjkegjghbchoncjhfkda">
         <picture>
            <source srcset="https://i.imgur.com/Jog9cQP.png" height="60" media="(width >= 710px)">
            <img src="https://i.imgur.com/Jog9cQP.png" width="41%" alt="Microsoft Store for Edge">
         </picture>
      </a>
   </div>
</td></tr></table>

Most websites today want to process your data and ask for consent using cookie banners. While these banners are meant to give you control, in practice they often result in repetitive and time-consuming clicks—especially if your browser clears cookies when you close it. The same banner reappears, and you find yourself making the same choices again and again.

Consent-O-Matic is a browser extension designed to solve this problem. Developed by the Centre for Advanced Visualization and Interaction (CAVI) at Aarhus University, the tool automatically handles consent banners on your behalf. After you set your preferences during installation, Consent-O-Matic will recognize many common Consent Management Platform (CMP) banners, apply your choices, and confirm with a little checkmark next to the extension icon.

Because Consent-O-Matic is an open-source project, anyone can contribute to its improvement by [adding new rules, updating old rules](#extending-consent-o-matic), or updating documentation. This collaborative approach ensures that the extension keeps pace with the constantly changing landscape of online consent banners—and makes it easier for everyone to safeguard their data with less hassle.


### Further reading
#### Academic Papers
- [Nouwens, M., Liccardi, I., Veale, M., Karger, D., & Kagal, L. (2020, April). Dark patterns after the GDPR: Scraping consent pop-ups and demonstrating their influence. In Proceedings of the 2020 CHI conference on human factors in computing systems](https://doi.org/10.1145/3313831.3376321). [Open source PDF](https://arxiv.org/pdf/2001.02479.pdf)
- [Nouwens, M., Bagge, R., Kristensen, J. B., & Klokmose, C. N. (2022, April). Consent-o-Matic: Automatically answering consent pop-ups using adversarial interoperability. In CHI Conference on Human Factors in Computing Systems Extended Abstracts](https://doi.org/10.1145/3491101.3519683) [Open source PDF](https://web.archive.org/web/20220505144232id_/https://dl.acm.org/doi/pdf/10.1145/3491101.3519683)
- [Nouwens, M., Kristensen, J. B., Maalt, K., & Bagge, R. (2025, April). A Cross-Country Analysis of GDPR Cookie Banners and Flexible Methods For Scraping Them. In Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems](https://doi.org/10.1145/3706598.3713648)

#### Other mentions
- Recommended by the Dutch Data Protection Authority: [Privacy risks and protecting your privacy when accepting cookies](https://www.autoriteitpersoonsgegevens.nl/en/themes/internet-and-smart-devices/cookies/privacy-risks-and-protecting-your-privacy-when-accepting-cookies)
- Recommended by Mozilla: [Top anti-tracking extensions](https://addons.mozilla.org/blog/top-anti-tracking-extensions/)
- [Open-Source ‘Consent-O-Matic’ Tool Lets Anyone Automatically Stop Websites From Tracking Them (Vice, September 2022)](https://www.vice.com/en/article/y3p5q5/open-source-consent-o-matic-tool-lets-anyone-automatically-stop-websites-from-tracking-them)
- [How to stop annoying cookie pop-ups from ruining your browsing (TheNextWeb, May 2022)](https://thenextweb.com/news/how-to-stop-cookie-pop-ups-from-ruining-your-browsing)
- [How to Avoid Those Infuriating Cookie Pop-Ups (Wired, 2021)](https://www.wired.com/story/avoid-cookie-popups-gdpr/)
- [Virksomheder narrer brugerne til mere dataovervågning (PROSA, March 2020, in Danish)](https://www.prosa.dk/artikel/virksomheder-narrer-brugerne-til-mere-dataovervaagning/)<sup>[\[Internet Archive\]](https://web.archive.org/web/20200511044414/https://www.prosa.dk/artikel/virksomheder-narrer-brugerne-til-mere-dataovervaagning/)</sup>
- [Accepterer du cookies? Her er fire metoder til at undgå overvågning på nettet (DR, January 2020, in Danish)](https://www.dr.dk/nyheder/viden/teknologi/accepterer-du-cookies-her-er-fire-metoder-til-undgaa-overvaagning-paa-nettet)

## Compatible CMPs

Consent-O-Matic currently works with more than 200 CMPs (see full list [here](https://github.com/cavi-au/Consent-O-Matic/tree/master/rules)), including major platforms like UserCentrics, CookieBot, OneTrust, as well as cookie banners for specific websites. 

## Privacy

Consent-O-Matic uses the following set of permissions in the browser when installed:

* Access to read all pages - It searches each page you visit for consent-related popups that it knows how to handle
* Information about tab URLs - You can turn the extension on/off on a page-by-page basis by clicking the icon. To check if it is enabled it needs to know the address of the page you are visiting
* Storage - Your preferences and settings are stored directly in your browser

The extension only communicates with the web in two situations:

* When fetching and updating rule lists
* When you report a website as not working through the extension icon menu (the **Let us know!** button)

The URL of the website reported through the extension icon is [sent](https://github.com/cavi-au/Consent-O-Matic/blob/master/Extension/popup.js#L50) to a website hosted by Aarhus University in the form of a URI-encoded query string (e.g., LinkedIn will be reported as `https://gdprconsent.projects.cavi.au.dk/report.php?url=www.linkedin.com`). 

## Installation

We highly recommend installing directly through the official extension store of your browser ([mentioned at the top](#consent-o-matic)). Installing through the official channels will automatically keep you up-to-date with new versions when they are released.

It is also possible to get the extension by other means.

### Installing from Archived Release

As an alternative to extension stores you can manually download and extract one of the published versions from the [Releases](https://github.com/cavi-au/Consent-O-Matic/releases) page on Github.

If you do that you have to use the developer feature of the browser to [Load Unpacked](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) (Chrome) or [Load Temporary Addon](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing) (Firefox) and point it at the manifest.json in the unpacked zip-directory.

### Building from Source

Lastly, if you intend to review or make changes to the code, you can build and install directly from the source code:

```
git clone https://github.com/cavi-au/Consent-O-Matic.git
cd Consent-O-Matic
npm install
```

and then run one of ```npm run build-firefox``` or ```npm run build-chromium``` or ```npm run build-safari```

For Firefox or Chromium you can now proceed as above for installing release archives but point the browser at the `build` folder or a folder where you extracted the zip from build/dist/. Safari requires loading the XCode project to further build an app.

We do not recommend installing from source.

## Extending Consent-O-Matic

If your favorite CMP is missing from the current list, feel free to either create a custom list that you can add (click the extension icon in your browser, click "More add-on settings", click "Rule lists", and enter the URL of your custom list.). If you **really** want to contribute, feel free to create a Pull Request while you're at it.

Users can send reports when rules for specific websites are not working. The full list of reported URLs is available [here](https://gdprconsent.projects.cavi.au.dk/reports.php). The number indicates how many times the URL was reported. This list currently does not show if/when the rules for a URL have been checked/adjusted, so always verify whether the rule is still broken/missing before you start working on it. 


### Rule elements

* [Basic Structure](#basic-structure)
   * [Detectors](#detectors)
   * [Methods](#methods)
* [DOM Selection](#dom-selection)
* [Actions](#actions)
   * [Click](#click)
   * [List](#list)
   * [Consent](#consent)
   * [Slide](#slide)
   * [If CSS](#if-css)
   * [Wait For CSS](#wait-for-css)
   * [For Each](#for-each)
   * [Wait](#wait)
   * [Hide](#hide)
   * [Close](#close)
* [Matchers](#matchers)
   * [CSS](#css)
   * [Checkbox](#checkbox)
* [Consent](#consent-1)
   * [Consent Categories](#consent-categories)
* [Full example](#full-example)

### Basic Structure

A rule list for Consent-O-Matic is a JSON structure that contains the rules for detecting a CMP (Consent Management Provider), and
dealing with the CMP popup when it is detected.

Each CMP is a named entry and contains 2 parts, `detectors` and `methods`. The name should ideally be the actual name of the underlying CMP (correctly capitalized and whitespaced) or of the website if it is unique to that domain. The name will be shown in the About section of extension's settings, so make it user-friendly.

```json
{
   "MyCMP": {
      "detectors": [ ... ],
      "methods": [ ... ]
   },
   "AnotherCMP": {
      "detectors": [ ... ],
      "methods": [ ... ]
   },
}
```

If more than 1 detector is added to a CMP, the CMP counts as detected if any of the detectors trigger.

#### Detectors

Detectors are the part that detects if a certain rule set should be applied. Basically, if a detector triggers, the methods will be applied.

Detector structure:

```json
{
   "presentMatcher": [{ ... }],
   "showingMatcher": [{ ... }]
}
```

The present matcher is used to detect if the CMP is present on the page.

Some CMPs still insert the popup HTML into the DOM even when re-visiting a page where you have already given consent earlier. We only want to handle the consent form if its actually showing on the page. This is what the showing matcher is used for.

Both the present and showing matcher follow the common structure of [`Matchers`](#matchers).

Both the present and showing matcher can be multiple matchers, only triggering the detector if all of the matchers (respectively for present and showing) apply.

#### Methods

Methods are collections of actions. There are 4 methods supported by Consent-O-Matic. `OPEN_OPTIONS`, `DO_CONSENT`, `SAVE_CONSENT`, `HIDE_CMP`

All the methods are optional, and, if present, the methods will be run in the order given below when a detector is triggered.

```
HIDE_CMP
OPEN_OPTIONS
HIDE_CMP
DO_CONSENT
SAVE_CONSENT
```

Methods take on the form:

```json
{
   "name": " ... ",
   "action": { ... }
}
```

where the name is one of the 4 supported methods and action is the [action](#actions) to execute.

---

### DOM Selection

Most actions and matchers have some target that they apply to. For this reason, Consent-O-Matic has a DOM selection mechanism that can easily help with selecting the correct DOM element.

```json
"parent": {
   "selector": ".some.css.selector",
   "textFilter": "someTextFilter",
   "styleFilter": {
      "option": "someStyleOption",
      "value": "someStyleValue",
      "negated": false
   },
   "displayFilter": true,
   "iframeFilter": false,
   "childFilter": {}
},
"target": {
   "selector": ".some.css.selector",
   "textFilter": "someTextFilter",
   "styleFilter": {
      "option": "someStyleOption",
      "value": "someStyleValue",
      "negated": false
   },
   "displayFilter": true,
   "iframeFilter": false,
   "childFilter": {}
}
```

There are 2 parts, `parent` and `target`. The `parent` is optional but if it exists it will be resolved first, and used as the starting point for `target`. This allows you to construct very complicated selections of elements that wouldn't otherwise be possible with a single plain CSS selector. One example of such is selecting into shadow DOM - where using parent to target the element with the shadow allows querying its children with the selector.

All the parameters to `parent` and `target` except `selector` are optional.

The selection method works by using the CSS selector from `selector` and then filtering the resulting DOM nodes via the various available filters:

* `textFilter` filters all nodes that do not include the given text. It can also be given as an array `"textFilter":["filter1", "filter2"]` and then it filters all nodes that do not include one of the given text filters.

* `styleFilter` filters based on computedStyles. `option` is the style option to compare for example `position`, `value` is the value to compare against and `negated` sets if the option value should match or not match the given value.

* `displayFilter` can be used to filter nodes based on if they are display hidden or not.

* `iframeFilter` filters nodes based on if they are inside an iframe or not.

* `childFilter` is a fully new DOM selection, that then filters on the original selection, based on if a selection was made by `childFilter` or not.

Here is an example DOM selection:

```json
"parent": {
   "selector": ".myParent",
   "iframeFilter": true,
   "childFilter": {
      "target": {
         "selector": ".myChild",
         "textFilter": "Gregor"
      }
   }
},
"target": {
   "selector": ".myTarget"
}
```

This selector first tries to find the `parent` which is a DOM element with the class `myParent` that is inside an iframe and has a child DOM element with the class `myChild` that contains the text "Gregor".

Then, using this parent as "root", it tries to find a DOM element with the class `myTarget`.

This could then be the target of an action or matcher.

---

### Actions

Actions are the part of Consent-O-Matic that actually do stuff. Some actions do something to a target selection, others have to do with control flow.

#### Click

This action simulates a mouse click on its target.

Example:

```json
{
   "type": "click",
   "target": {
      "selector": ".myButton",
      "textFilter": "Save settings"
   },
   "openInTab": false
}
```

`openInTab` if set to true, will trigger a ctrl+shift+click instead of a click, which should make the link, if any, open in a new tab, and focus that tab.

In this example we only use a simple `target` with a `textFilter` but full [DOM selection](#dom-selection) is supported.

#### List

This action runs a list of actions in order.

Example:

```json
{
   "type": "list",
   "actions": []
}
```

`actions` is an array of actions that will all be run in order.

#### Consent

The consent action takes an array of consents, and tries to apply the users consent selections.

Example:

```json
{
   "type": "consent",
   "consents": []
}
```

`consents` is an array of [Consent](#consent-1) types

#### Slide

Some consent forms use a slider to set a consent level, this action supports simulating sliding with such a slider.

Example:

```json
{
   "type": "slide",
   "target": {
      "selector": ".mySliderKnob"
   },
   "dragTarget": {
      "target": {
         "selector": ".myChoosenOption"
      }
   },
   "axis": "y"
}
```

`target` is the target DOM element to simulate the slide motion on.

`dragTarget` is the DOM element to use for slide distance.

`axis` selects if the slider should go horizontal "x" or vertical "y".

The slide event will simulate that the mouse dragged `target` the distance from `target` to `dragTarget` on the given `axis`.

#### If CSS

This action is used as control flow, running another action depending on if a DOM selection finds an element or not.

Example:

```json
{
   "type": "ifcss",
   "target": {
      "selector": "",
   },
   "trueAction": {
      "type": "click",
      "target": {
         "selector": ".myTrueButton"
      }
   },
   "falseAction": {
      "type": "click",
      "target": {
         "selector": ".myFalseButton"
      }
   }
}
```

`trueAction` is an action that will be run if the DOM selection finds an element.
`falseAction` will be run when the DOM selection does not find an element.

#### Wait For CSS

This action waits until the DOM selector finds a DOM element that matches. This is mostly used if something in the consent form loads slowly and needs to be waited for.

Example:

```json
{
   "type": "waitcss",
   "target": {
      "selector": ".myWaitTarget"
   },
   "retries": 10,
   "waitTime": 200,
   "negated": false
}
```

`retries` is the number of times to check for the target DOM element. Deafults to 10.

`waitTime` determines the time between retry attempts. Defaults to 250.

`negated` makes "Wait For CSS" wait until the target is NOT found.

#### For Each

If some set of actions needs to be run several times, but with different DOM nodes as root, the for each action can be used. It runs its action 1 time for each DOM element that is selected by its DOM selection; all actions run inside the for each loop will see the DOM as starting from the currently selected node.

Example:

```json
{
   "type": "foreach",
   "target": {
      "selector": ".loopElement"
   },
   "action": {}
}
```

`action` is the action to run for each found DOM element.

#### Wait

This action waits the given amount of milliseconds before continuing.

Example:

```json
{
   "type": "wait",
   "waitTime": 250
}
```

#### Hide

This action sets CSS class 'ConsentOMatic-CMP-Hider' on the DOM selection. The default CSS rules will then set opacity to 0 on the element.

Example:

```json
{
   "type": "hide",
   "target": {
      "selector": ".myHiddenClass"
   }
}
```

#### Close

This action closes the current tab, useful for consent providers like Evidon, which likes to open new tabs with the consent dashboard inside.

Example:

```json
{
   "type": "close"
}
```

### Matchers

Matchers are used to check for the presence of some DOM selection, or the state of some DOM selection.

#### CSS

This matcher checks for the presence of a DOM selection, and return that it matches if it exists.

Example:

```json
{
   "type": "css",
   "target": {
      "selector": ".myMatchingClass"
   }
}
```

#### Checkbox

This matcher checks the state of an `<input type='checkbox' />` and returns that it matches if the checkbox is checked.

Example:

```json
{
   "type": "checkbox",
   "target": {
      "selector": ".myInputCheckbox"
   }
}
```

---

### Consent

This is what is used inside [Consent Actions](#consent) and defines the actual consent that the user should be giving or not giving.

Each consent has a type, that matches the consent categories inside Consent-O-Matic, so if a user has toggled the first consent category to ON, (Type A) and the consent is of type "A", then the consent will be enabled.

Usually the consent is given either as a toggle, or a set of buttons on/off. Therefore `consent` has a mechanism for each of these cases.

Example:

```json
{
   "type": "A",
   "toggleAction": {},
   "matcher": {},
   "trueAction": {},
   "falseAction": {}
}
```

`type` is the type of consent category this rule defines and determines if this consent should be on or off depending on the user's selection for that type of category.

`toggleAction` this action is used to select consent if the popup uses a toggle or a switch to communicate consent. The action will be run if the matcher says the consent is in a state different from what the user has asked it to be, otherwise it will not be run.

`matcher` is the matcher used to check which state the consent is in. For a [checkbox matcher](#checkbox), the consent is given if the checkbox is checked. For a [CSS matcher](#css) the consent is given if the matcher finds a DOM selection.

`trueAction` and `falseAction` are actions used if consent instead has to be given by pressing one of two buttons, rather than being toggled on/off. These will be run depending on the user's selection of consent. If the user has given consent for this category type, the `trueAction` will be run, and `falseAction` will be run if the user has not given consent to this category type.

If `toggleAction` and `matcher` is present on the content config, toggleAction will be used, if one of them is missing, `trueAction`/`falseAction` will be used instead.

#### Consent Categories

As seen in the addon settings, in the same order:

* D: Information Storage and Access
* A: Preferences and Functionality
* B: Performance and Analytics
* E: Content selection, delivery, and reporting
* F: Ad selection, delivery, and reporting
* X: Other Purposes

---

### Full example

Putting it all together, here is a full example of a CMP "MyCMP" that has 2 consent categories to toggle.

```json
{
   "MyCMP": {
      "detectors": [
         {
            "presentMatcher": {
               "type": "css",
               "target": {
                  "selector": "#theCMP"
               }
            },
            "showingMatcher": {
               "target": {
                  "selector": "#theCMP.isShowing"
               }
            }
         }
      ],
      "methods": [
         {
            "name": "OPEN_OPTIONS",
            "action": {
               "type": "click",
               "target": {
                  "selector": ".button",
                  "textFilter": "Change settings"
               }
            }
         },
         {
            "name": "DO_CONSENT",
            "action": {
               "type": "list",
               "actions": [
                  {
                     "type": "click",
                     "target": {
                        "selector": ".menu-vendors"
                     }
                  },
                  {
                     "type": "consent",
                     "consents": [
                        {
                           "type": "A",
                           "matcher": {
                              "type": "checkbox",
                              "parent": {
                                 "selector": ".vendor-item",
                                 "textFilter": "Functional cookies"
                              },
                              "target": {
                                 "selector": "input"
                              }
                           },
                           "toggleAction": {
                              "type": "click",
                              "parent": {
                                 "selector": ".vendor-item",
                                 "textFilter": "Functional cookies"
                              },
                              "target": {
                                 "selector": "label"
                              }
                           }
                        },
                        {
                           "type": "F",
                           "matcher": {
                              "type": "checkbox",
                              "parent": {
                                 "selector": ".vendor-item",
                                 "textFilter": "Advertisement cookies"
                              },
                              "target": {
                                 "selector": "input"
                              }
                           },
                           "toggleAction": {
                              "type": "click",
                              "parent": {
                                 "selector": ".vendor-item",
                                 "textFilter": "Advertisement cookies"
                              },
                              "target": {
                                 "selector": "label"
                              }
                           }
                        }
                     ]
                  }
               ]
            }
         },
         {
            "name": "SAVE_CONSENT",
            "action": {
               "type": "click",
               "target": {
                  "selector": ".save-consent-btn"
               }
            }
         }
      ]
   }
}
```
