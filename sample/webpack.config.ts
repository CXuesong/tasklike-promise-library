import CopyPlugin from "copy-webpack-plugin";
import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";

// tslint:disable:object-literal-sort-keys
const config: webpack.Configuration = {
  mode: "development",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/issues/43232
  devServer: {
    contentBase: __dirname,
    compress: true,
    port: 18080,
    watchContentBase: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  plugins: [
    new CopyPlugin([
      "./index.html",
      "./index.css",
      "./tsconfig.json"   // We need this one for XHR payload.
    ]) as any,
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true, // Must be set to true if using source-maps in production
        terserOptions: {
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        }
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js"
  }
};

export default config;
