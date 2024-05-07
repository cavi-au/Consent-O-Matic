const path = require('path');
const glob = require("glob");
module.exports = {
  mode: 'production',
  entry: {
    service: ['./Extension/background.js'],
    content: [
	'./Extension/contentScript.js',
	"./Extension/manifest.json", 
	"./Extension/content.css",
	...glob.sync(__dirname + "/Extension/*.png"),
	...glob.sync(__dirname + "/Extension/*.svg")
    ],
    ui: [
	'./Extension/options.js',
	...glob.sync(__dirname + "/Extension/*.html")

    ]
  },
  output: {
    publicPath: "",
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(png|json|svg|html|css)/,
        type: 'asset/resource',
        generator: {
		filename: '[name][ext]'
        }
      }
    ]
  },
}