const path = require('path');
const glob = require("glob");
module.exports = {
  mode: 'production',
  entry: {
    service: ['./Extension/background.js'],
    content: [
      './Extension/contentScript.js',
      "./Extension/manifest.json",
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

  },
  output: {
    publicPath: "",
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
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
}