const { merge } = require("webpack-merge");
const { resolve } = require("path");
const TerserPlugin = require("terser-webpack-plugin");


const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "production",
  entry: "./index.tsx",
  output: {
    filename: "js/bundle.[contenthash].min.js",
    path: resolve(__dirname, "../build"),
    publicPath: "/",
    libraryTarget: 'umd',
  },
  // devtool: "source-map",
  plugins: [],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({

      terserOptions: {
        keep_classnames: true,
      },
    })],
  },
});