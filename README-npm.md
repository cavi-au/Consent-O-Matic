# Consent-O-Matic Library

A JavaScript library for detecting and handling GDPR consent popups and cookie banners. This library provides the core consent management logic from the Consent-O-Matic browser extension as a reusable ESM module.

## Installation

```bash
npm install consent-o-matic
```

## Usage

### Basic Usage

```javascript
import { ConsentEngine, CMP, Detector, Matcher } from 'consent-o-matic';

// Create a consent engine with your configuration
const consentEngine = new ConsentEngine(config, consentTypes, handledCallback);

// Or work with individual components
const cmp = new CMP('myCMP', cmpConfig);
const detector = new Detector(detectorConfig);
```

### Tree-Shaking Support

The library supports tree-shaking, allowing you to import only the rules you need:

```javascript
// Import only specific rules - unused rules will be excluded from your bundle
import { cookiebot, onetrust, amazon } from 'consent-o-matic';

// Use individual rules
const cookiebotCMP = new CMP('cookiebot', cookiebot);
const onetrustCMP = new CMP('onetrust', onetrust);
```

This approach is more efficient than importing all rules and allows bundlers to optimize your final bundle size.

### Example: Setting up a Consent Engine

```javascript
import { ConsentEngine } from 'consent-o-matic';

// Configuration for different CMPs (Consent Management Platforms)
const config = {
  'cookiebot': {
    detectors: [
      {
        presentMatcher: { type: 'css', selector: '#CookieConsent' },
        showingMatcher: { type: 'css', selector: '#CookieConsent:not(.hidden)' }
      }
    ],
    methods: [
      {
        name: 'acceptAll',
        action: {
          type: 'click',
          selector: '#CookieConsentAcceptAll'
        }
      }
    ]
  }
};

// Types of consent you want to handle
const consentTypes = ['necessary', 'analytics', 'marketing'];

// Callback when consent is handled
const handledCallback = (cmpName, consentType) => {
  console.log(`Handled ${consentType} consent for ${cmpName}`);
};

// Create and start the consent engine
const engine = new ConsentEngine(config, consentTypes, handledCallback);
```

### Working with CMPs

```javascript
import { CMP } from 'consent-o-matic';

const cmpConfig = {
  detectors: [
    {
      presentMatcher: { type: 'css', selector: '.cookie-banner' },
      showingMatcher: { type: 'css', selector: '.cookie-banner:visible' }
    }
  ],
  methods: [
    {
      name: 'accept',
      action: {
        type: 'click',
        selector: '.accept-cookies'
      }
    }
  ]
};

const cmp = new CMP('myCookieBanner', cmpConfig);

// Check if CMP is present
if (cmp.detect()) {
  console.log('Cookie banner detected!');
  
  // Check if it's currently showing
  if (cmp.isShowing()) {
    console.log('Cookie banner is visible');
    
    // Execute a method
    const method = cmp.methods.get('accept');
    if (method) {
      method.execute();
    }
  }
}
```

### Creating Custom Detectors

```javascript
import { Detector } from 'consent-o-matic';

const detectorConfig = {
  presentMatcher: [
    { type: 'css', selector: '#gdpr-banner' },
    { type: 'url', pattern: 'example.com' }
  ],
  showingMatcher: [
    { type: 'css', selector: '#gdpr-banner:not(.hidden)' }
  ]
};

const detector = new Detector(detectorConfig);

// Check if conditions are met
if (detector.detect()) {
  console.log('GDPR banner is present');
  
  if (detector.isShowing()) {
    console.log('GDPR banner is visible');
  }
}
```

### Using Matchers

```javascript
import { Matcher } from 'consent-o-matic';

// CSS Matcher
const cssMatcher = Matcher.createMatcher({
  type: 'css',
  selector: '.cookie-notice'
});

// URL Matcher
const urlMatcher = Matcher.createMatcher({
  type: 'url',
  pattern: 'example.com'
});

// Check if matchers match
if (cssMatcher.matches()) {
  console.log('CSS selector matched');
}

if (urlMatcher.matches()) {
  console.log('URL pattern matched');
}
```

## API Reference

### ConsentEngine

The main class that orchestrates consent detection and handling.

- `constructor(config, consentTypes, handledCallback)`
- `static enforceScrollBehaviours(shouldEnforce)`

### CMP (Consent Management Platform)

Represents a specific consent management platform with detection and action methods.

- `constructor(name, config)`
- `detect()` - Check if CMP is present
- `isShowing()` - Check if CMP is currently visible
- `methods` - Map of available action methods

### Detector

Handles detection logic for CMPs using various matchers.

- `constructor(config)`
- `detect()` - Check if all present matchers match
- `isShowing()` - Check if all showing matchers match

### Matcher

Base class for different types of matchers.

- `static createMatcher(config)` - Factory method for creating matchers
- `matches()` - Check if the matcher matches current conditions

Available matcher types:
- `CssMatcher` - CSS selector matching
- `CheckboxMatcher` - Checkbox state matching
- `URLMatcher` - URL pattern matching
- `OnOffMatcher` - Toggle state matching

### Action

Handles execution of consent actions.

- `static createAction(config, cmp)` - Factory method for creating actions
- `execute()` - Execute the action

## Available Rules

The library includes 200+ pre-configured CMP rules for popular consent management platforms:

### Major CMPs
- **Cookiebot** - `cookiebot`
- **OneTrust** - `onetrust`, `onetrust_banner`, `onetrust_pcpanel`, `onetrust_pctab`
- **Optanon** - `optanon`, `optanon_alternative`, `optanon_springernature`
- **Sourcepoint** - `sourcepoint`, `sourcepoint_frame`, `sourcepoint_popup`
- **TrustArc** - `trustarc_bar`, `trustarc_frame`, `trustarc_popup_hider`

### Platform Rules
- **Google** - `google_cwiz`, `google_popup`, `google_eomdialog`
- **Facebook** - `facebook`
- **Amazon** - `amazon`, `aws`
- **Microsoft** - Various Bing and Microsoft services

### Regional & Industry Rules
- **GDPR/CCPA** - Various compliance frameworks
- **Banking** - `danskebank`, `bankofscotland`, `seb`
- **E-commerce** - `etsy`, `aliexpress`, `cdiscount`
- **Media** - `bbc_fc`, `channel4`, `sverigesradio`

Import only the rules you need for optimal bundle size:

```javascript
import { cookiebot, onetrust } from 'consent-o-matic';
```

## Configuration

The library uses a rule-based configuration system. Each CMP configuration includes:

- **detectors**: Array of detection rules
- **methods**: Array of available actions
- **hiddenTargets**: Elements to hide during consent handling

## Browser Support

- Modern browsers with ES6+ support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related

- [Consent-O-Matic Browser Extension](https://github.com/cavi-au/Consent-O-Matic) - The full browser extension
- [Rules Repository](https://github.com/cavi-au/Consent-O-Matic/tree/main/rules) - Community-maintained CMP rules
