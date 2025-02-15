import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { EnvironmentPlugin } from 'webpack';
import { DB_CREDENTIALS } from './src/shared/config/credentials';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require("copy-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const assets = ['img'];
export const plugins = [
  new EnvironmentPlugin({
    DATABASE_URL: `mysql://${DB_CREDENTIALS.user}:${DB_CREDENTIALS.password}@192.168.1.82:3306/eduinsight`,
    LOCAL_SOCKET_URL: 'https://192.168.1.90:3306:4000',
    LOCAL_DATABASE_URL: `mysql://${DB_CREDENTIALS.user}:${DB_CREDENTIALS.password}@192.168.1.90:3306:3306/eduinsight`,
    REMOTE_SOCKET_URL: 'https://socket.eduinsight.systems',
    REMOTE_DATABASE_URL: `mysql://${DB_CREDENTIALS.user}:${DB_CREDENTIALS.password}@proxy.eduinsight.systems:8080/eduinsight`,
    AUTH_TOKEN: "eduinsight_socket_9a8b7c6d5e4f3g2h1i",
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
