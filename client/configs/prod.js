const { merge } = require("webpack-merge");
const { resolve } = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const os = require("os");

const commonConfig = require("./common");
console.log({
  cpus: os.cpus().length,
  cpuSpeed: os.cpus()[0].speed,
  cpuModel: os.cpus()[0].model,
  totalmemGb: os.totalmem / (1024 * 1024 * 1024),
});
module.exports = merge(commonConfig, {
  mode: "production",
  entry: "./index.tsx",
  output: {
    filename: "js/[name].bundle.js",
    path: resolve(__dirname, "../build"),
    publicPath: "/",
    libraryTarget: "umd",
  },
  plugins: [],
  optimization: {
    splitChunks: {
      chunks: "all",
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        /** Reduces RAM usage to 1.5-2gb from 4. Time increases to 50s from 30s */
        parallel: false,
        terserOptions: {
          keep_classnames: true,
        },
      }),
    ],
  },
});
