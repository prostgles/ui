const { resolve } = require("path");
const { merge } = require("webpack-merge");
const commonConfig = require("./common");
const OnDevCompiled = require("./OnDevCompiled");
const { DefinePlugin } = require("webpack");

module.exports = merge(commonConfig, {
  mode: "development",
  entry: ["./index.tsx"],
  output: {
    filename: "js/[name].bundle.js",
    path: resolve(__dirname, "../build"),
    publicPath: "/",
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  devtool: "cheap-module-source-map",
  plugins: [
    new OnDevCompiled({ options: true }),
    new DefinePlugin({
      __REACT_DEVTOOLS_GLOBAL_HOOK__: "({ isDisabled: true })",
    }),
  ],
  watchOptions: {
    ignored: ["node_modules"],
  },
});
