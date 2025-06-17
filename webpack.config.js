const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const PACKAGE = require('./package.json');
const ZipPlugin = require('zip-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');
const glob = require("glob");
module.exports = env=>({
  mode: 'production',
  entry: {
    service: ['./Extension/background.js'],
    content: [
      './Extension/contentScript.js',
      "./Extension/content.scss",
      "./Extension/icon_48.png",
      "./Extension/icon_96.png",
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
    path: path.resolve(__dirname, 'build')
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