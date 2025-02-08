import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

import { EnvironmentPlugin } from 'webpack';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require("copy-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const assets = ['img'];
export const plugins = [
  new EnvironmentPlugin({
    DATABASE_URL: process.env.DATABASE_URL,
    LOCAL_SOCKET_URL: process.env.LOCAL_SOCKET_URL,
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
    REMOTE_SOCKET_URL: process.env.REMOTE_SOCKET_URL,
    REMOTE_DATABASE_URL: process.env.REMOTE_DATABASE_URL,
    AUTH_TOKEN: process.env.AUTH_TOKEN,
  }),
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new CopyWebpackPlugin({
    patterns: [{ from: './node_modules/.prisma/client' }],
  }),
  ...assets.map(asset => {
    return new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/main/assets', asset),
          to: path.resolve(__dirname, '.webpack/main', asset)
        }
      ]
    });
  })
];
