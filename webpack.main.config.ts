import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import path from 'path';
export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'package.json': path.resolve(__dirname, 'package.json'),
      'ws': path.resolve(path.join(__dirname, 'node_modules/ws/index.js' )),
    },
  },
  /**
   * "sharp" does not get packaged correctly in this electron/electron-forge setup.
   * That's why we define it as an external dependency (and copy the node module manually to the
   * output folder, see webpack.main.plugins.js)
   * @see https://github.com/lovell/sharp/issues/1951
   */
  externals: {
    sharp: 'commonjs sharp',
  },
};
