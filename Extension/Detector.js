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
            if(matcher != null) {
                this.presentMatchers.push(Matcher.createMatcher(matcher));
            }
        });
        this.config.showingMatcher.forEach((matcher)=>{
            if(matcher != null) {
                this.showingMatchers.push(Matcher.createMatcher(matcher));
            }
        });
    }

    detect() {
        if(this.presentMatchers.length === 0) {
            return false;
        }

        return this.presentMatchers.every((matcher)=>{
            return matcher.matches();
        });
    }

    isShowing() {
        if(this.showingMatchers.length === 0) {
            return true;
        }

        return this.showingMatchers.every((matcher)=>{
            return matcher.matches();
        });
    }
}
