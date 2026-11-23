const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const PACKAGE = require('./package.json');
const ZipPlugin = require('zip-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');
const glob = require("glob");
const {parseCookieFilters} = require("./filters/parse-cookie-filters.cjs");
module.exports = env=>({
  mode: 'production',
  entry: {
    service: ['./Extension/background.js'],
    content: [
      './Extension/contentScript.js',
      "./Extension/content.scss",
      "./Extension/icon_16.png",
      "./Extension/icon_32.png",
      "./Extension/icon_48.png",
      "./Extension/icon_96.png",
      "./Extension/icon_128.png",
      "./Extension/logo.png",
      ...glob.sync(__dirname + "/Extension/*.svg")
    ],
    ui: [
      './Extension/options.js',
      './Extension/popup.js',
      './Extension/ui.scss',
      ...glob.sync(__dirname + "/Extension/*.html")
    ],
    editor: [
      ...glob.sync(__dirname + "/Extension/editor/js/*.js"),
      './Extension/editor/scss/main.scss',
      ...glob.sync(__dirname + "/Extension/editor/*.html")
    ]
  },
  output: {
    publicPath: "",
    filename: '[name].js',
    // Chromium builds into build/; Firefox and Safari get their own folders so that
    // `npm run build` can't leave another browser's manifest in build/
    path: path.resolve(__dirname, env.target === 'chromium' ? 'build' : 'build-' + env.target)
  },
  module: {
    parser: {
	javascript: {
	    exportsPresence: "error",
	    importExportsPresence: "error"
	}
    },
    rules: [
      {
        test: /\.(png|json|svg|html)/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
      {
        test: /\.(sc|sa)ss$/i,
        type: 'asset/resource',
        use: [
          "sass-loader"
        ],
        generator: {
          filename: '[name].css'
        }
      },      
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      '...',
      new HtmlMinimizerPlugin(),
     ],
  },
  plugins: [
    new CopyPlugin({patterns: [{
        // Consent-O-Manual: cookie-notice filter list -> selectors used to detect banners no rule covers
        from: "filters/cookie-notices.txt",
        to: "cookie-filters.json",
        transform(content) {
            return JSON.stringify(parseCookieFilters(content.toString()));
        }
    }, {
        // Consent-O-Manual: merge our own rule files into one bundled rule list
        from: "rules-plus/*.json",
        to: "plus-rules.json",
        transformAll(assets) {
            const merged = {};
            assets.forEach((asset) => {
                const rules = JSON.parse(asset.data.toString());
                delete rules["$schema"];
                Object.assign(merged, rules);
            });
            return JSON.stringify(merged);
        }
    }, {
        from: "Extension/manifest." + env.target + ".json",
        to: "manifest.json",
        force: true,
        transform(content, path) {
            // Parse the manifest JSON and inject version
            const manifest = JSON.parse(content.toString());
            manifest.version = PACKAGE.version;
            return JSON.stringify(manifest, null, 2);
        }
    }]}),
    new ZipPlugin({
      path: 'dist/',
      filename: PACKAGE.name+"-v"+PACKAGE.version+"-unpacked-release-"+env.target+".zip",
      exclude: [/^dist/]
    })
  ]
});