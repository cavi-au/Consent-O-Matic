class Detector {
    constructor(config) {
        this.config = config;

        this.presentMatcher = Matcher.createMatcher(this.config.presentMatcher);
        this.showingMatcher = Matcher.createMatcher(this.config.showingMatcher);
    }

    detect() {
        return this.presentMatcher.matches();
    }

    isShowing() {
        return this.showingMatcher.matches();
    }
}
