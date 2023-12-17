const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const APP_DIR = path.resolve(__dirname, '../src');
const MONACO_DIR = path.resolve(__dirname, '../node_modules/monaco-editor');

const PRODUCTION = process.env.NODE_ENV === "production";

const getLoader = () => {
  const babel = {
    test: PRODUCTION? /\.jsx?$/ : [/\.jsx?$/, /\.tsx?$/],
    use: "babel-loader",
    exclude: /node_modules/,
  }
  if(!PRODUCTION) return [babel];
  return [
    babel,
    {
      test: /\.tsx?$/,
      loader: "ts-loader",
      exclude: /node_modules/,
      options: {
        projectReferences: true,
        transpileOnly: true
      }
    }
  ];
}

module.exports = {
  target: ["web", 'es2020'],
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
        use:[
          { loader: MiniCssExtractPlugin.loader, options:  { publicPath: '../../' }},
          { loader:'css-loader', options: { importLoaders: 1, sourceMap: false }, },
          { loader: "postcss-loader" }
          // { loader: require.resolve('css-loader'), options: { importLoaders: 1, sourceMap: false } },
        ],
        // use: ['style-loader', "css-loader"],

      },
			// {
			// 	test: /\.ttf$/,
			// 	use: ['file-loader']
			// },
      {
				test: /\.ttf$/,
        include: MONACO_DIR,
				type: 'asset/resource'
			},
      {
        test: /\.woff2?$/i,
        type: 'asset/resource',
        include: MONACO_DIR,
        dependency: { not: ['url'] },
      }, 
      {
        test: /\.(scss|sass)$/,
        include: APP_DIR,
        use: ["style-loader", "css-loader", "sass-loader", "postcss-loader"],
      }, {
        test: /\.css$/,
        include: MONACO_DIR,
        use: ['style-loader', 'css-loader' ],
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
    // new CopyWebpackPlugin({
    //   patterns: [
    //     // { from: "public", to: "." },
    //     { from: "../node_modules/monaco-editor/min/vs/", to: "vs" },
    //     !PRODUCTION && { from: "../node_modules/monaco-editor/min-maps/vs/", to: "min-maps/vs" }
    //   ].filter(Boolean)
    // }),
    new HtmlWebpackPlugin({ template: "index.html.ejs" }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
    }),
    new MonacoWebpackPlugin({ 
      // publicPath: "/monaco/" 
    }),
    new webpack.ProgressPlugin({
      activeModules: false,
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
    })
  ],
  output: {
    clean: true, // Clean the output directory before emit.
  },
  /**
   * This means to not use imports and expect these globally
   */
  // externals: {
  //   react: "React",
  //   "react-dom": "ReactDOM",
  // },
  performance: {
    hints: false,
  },
};