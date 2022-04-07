class Detector {
    constructor(config) {
        this.config = config;

        this.presentMatchers = [];
        this.showingMatchers = [];

        if(!Array.isArray(this.config.presentMatcher)) {
            this.config.presentMatcher = [this.config.presentMatcher];
        }
        if(!Array.isArray(this.config.showingMatcher)) {
            this.config.showingMatcher = [this.config.showingMatcher];
        }

        this.config.presentMatcher.forEach((matcher)=>{
            this.presentMatchers.push(Matcher.createMatcher(matcher));
        });
        this.config.showingMatcher.forEach((matcher)=>{
            this.showingMatchers.push(Matcher.createMatcher(matcher));
        });
    }

    detect() {
        return this.presentMatchers.every((matcher)=>{
            return matcher.matches();
        });
    }

    isShowing() {
        return this.showingMatchers.every((matcher)=>{
            return matcher.matches();
        });
    }
}
