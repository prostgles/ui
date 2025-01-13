const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const APP_DIR = path.resolve(__dirname, "../src");
const MONACO_DIR = path.resolve(__dirname, "../node_modules/monaco-editor");
const { SaveMdiIcons } = require("../setup-icons");
const PRODUCTION = process.env.NODE_ENV === "production";

const getLoader = () => {
  const babel = {
    test: PRODUCTION ? /\.jsx?$/ : [/\.jsx?$/, /\.tsx?$/],
    use: "babel-loader",
    exclude: /node_modules/,
  };
  if (!PRODUCTION) return [babel];
  return [
    babel,
    {
      test: /\.tsx?$/,
      loader: "ts-loader",
      exclude: /node_modules/,
      options: {
        projectReferences: true,
        transpileOnly: true,
      },
    },
  ];
};

/** Added m?js rules to ensure deck.gl community works. 
 *  Error: failed to resolve only because it was resolved as fully specified (probably because the origin is strict EcmaScript Module, 
 * e. g. a module with javascript mimetype, a '*.mjs' file, or a '*.js' file where the package.json contains '"type": "module"'). 
 * 
  {
    test: /\.m?js/,
    type: "javascript/auto",
  },
  {
    test: /\.m?js/,
    resolve: {
      fullySpecified: false,
    },
  },
  {
    // webpackl 4 fix for broken turf module: https://github.com/uber/@deck.gl-community/editable-layers/issues/64
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto'
  },

*/

module.exports = {
  target: ["web", "es2020"],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  context: resolve(__dirname, "../src"),
  module: {
    rules: [
      {
        test: /\.css$/,
        include: APP_DIR,
        exclude: /\.module\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: { publicPath: "../../" },
          },
          {
            loader: "css-loader",
            options: { importLoaders: 1, sourceMap: false },
          },
          { loader: "postcss-loader" },
          // { loader: require.resolve('css-loader'), options: { importLoaders: 1, sourceMap: false } },
        ],
      },
      {
        test: /\.ttf$/,
        include: MONACO_DIR,
        type: "asset/resource",
      },
      {
        test: /\.woff2?$/i,
        type: "asset/resource",
        include: MONACO_DIR,
        dependency: { not: ["url"] },
      },
      {
        test: /\.(scss|sass)$/,
        include: APP_DIR,
        use: ["style-loader", "css-loader", "sass-loader", "postcss-loader"],
      },
      {
        test: /\.css$/,
        include: MONACO_DIR,
        use: ["style-loader", "css-loader"],
      },
      ...getLoader(),
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          "file-loader?hash=sha512&digest=hex&name=img/[contenthash].[ext]",
          "image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false",
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html.ejs",
      v: require("../../electron/package.json")?.version,
    }),
    new MiniCssExtractPlugin({
      filename: "static/css/[name].[contenthash:8].css",
      chunkFilename: "static/css/[name].[contenthash:8].chunk.css",
    }),
    new MonacoWebpackPlugin({
      languages: ["typescript", "javascript", "sql", "pgsql", "json"],
    }),
    new webpack.ProgressPlugin({
      activeModules: true,
      entries: true,
      // handler(percentage, message, ...args) {
      //   console.log(percentage)
      // },
      modules: true,
      modulesCount: 5000,
      profile: false,
      dependencies: true,
      dependenciesCount: 10000,
      percentBy: null,
    }),
    new SaveMdiIcons(),
    // new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)(),
  ],
  output: {
    /* Clean the output directory before emit. */
    clean: true,
  },
  performance: {
    hints: false,
  },
};
