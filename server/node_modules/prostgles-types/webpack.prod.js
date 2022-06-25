const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: {
   'index_umd': './dist/index.js'
  },
  mode: 'production', // "development",// 
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        // use: 'ts-loader',
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          projectReferences: true,
        }
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    plugins: [
			new TsconfigPathsPlugin(),
		],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
    globalObject: 'this || window',
    umdNamedDefine: true
  },
};