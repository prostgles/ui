const { resolve } = require("path");
const { merge } = require("webpack-merge");
const commonConfig = require("./common"); 
const OnDevCompiled = require("./OnDevCompiled");

module.exports = merge(commonConfig, {
  mode: "development",
  entry: [ 
    // "webpack-dev-server/client?http://localhost:8080", // bundle the client for webpack-dev-server and connect to the provided endpoint
    "./index.tsx", // the entry point of our app
  ],
  output: {
    filename: "js/bundle.[chunkhash].min.js",
    path: resolve(__dirname, "../build"),
    publicPath: "/",
    clean: true,
  },

  /**
   * Maybe fix memory leaks
   *  contenthash => chunkhash
   * https://github.com/webpack/webpack-dev-server/issues/1433#issuecomment-473342612
   */
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  devtool: "cheap-module-source-map",
  plugins: [new OnDevCompiled({ options: true })],
});