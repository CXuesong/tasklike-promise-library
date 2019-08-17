import path from "path";
import webpack from "webpack";

// tslint:disable:object-literal-sort-keys
const config: webpack.Configuration = {
  mode: "development",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
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
    extensions: [ ".tsx", ".ts", ".js" ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js"
  }
};

export default config;
