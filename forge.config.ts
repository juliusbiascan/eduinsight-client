import type { ForgeConfig } from '@electron-forge/shared-types';
import {
  MakerSquirrel,
} from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
//import { MakerWix } from '@electron-forge/maker-wix';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import path from 'path';

import packageJson from './package.json';
const { version } = packageJson;
const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/+(*.node|*.dll|)',
    },
    // win32metadata: {
    //    'application-manifest': path.resolve(__dirname, 'app.manifest'),
    // },
    name: 'EduInsight Client',
    icon: path.resolve(__dirname, 'images/app-icon.ico'),
    appBundleId: 'io.eduinsight.client',
    appCopyright: 'Copyright © 2024',
    appVersion: '1.0.0',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel((arch: string) => ({
      setupExe: `eduinsight-client-${version}-win32-${arch}-setup.exe`,
      setupIcon: path.resolve(__dirname, 'images/app-icon.ico'),
      iconUrl: path.resolve(__dirname, 'images/app-icon.ico'),
      loadingGif: path.resolve(__dirname, 'images/setup.gif'),
      platforms: ['win32'],
    })),
    // new MakerWix({
    //   name: 'EduInsight Client',
    //   language: 1033,
    //   icon: path.resolve(__dirname, 'images/app-icon.ico'),
    //   description: 'Computer lab monitoring and control software',
    //   manufacturer: 'Julius Biascan',
    //   exe: 'EduInsight Client',
    //   upgradeCode: '8a22b26c-3275-41db-9faa-2db883f25d63',

    //   ui: {
    //     chooseDirectory: true,
    //   },
    //   features: {
    //     autoLaunch: true,
    //     autoUpdate: true,
    //   },
    // }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'juliusbiascan',
          name: 'eduinsight-client',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/assets/index.html',
            js: './src/renderer/windows/main/index.tsx',
            name: 'main_window',
            preload: {
              js: './src/renderer/lib/preload.ts',
            },
          },
          {
            html: './src/renderer/assets/index.html',
            js: './src/renderer/windows/setup/index.tsx',
            name: 'setup_window',
            preload: {
              js: './src/renderer/lib/preload.ts',
            },
          },

          {
            html: './src/renderer/assets/index.html',
            js: './src/renderer/windows/dashboard/index.tsx',
            name: 'dashboard_window',
            preload: {
              js: './src/renderer/lib/preload.ts',
            },
          },
          {
            html: './src/renderer/assets/index.html',
            js: './src/renderer/windows/quiz/quiz-player.tsx',
            name: 'quiz_player_window',
            preload: {
              js: './src/renderer/lib/preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
