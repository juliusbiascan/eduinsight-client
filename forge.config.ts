import type { ForgeConfig } from '@electron-forge/shared-types';
import {
  MakerSquirrel,
  MakerSquirrelConfig,
} from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/+(*.node|*.dll|)',
    },
    name: 'EduInsight Client',
    icon: path.resolve(__dirname, 'images/app-icon.ico'),
    appBundleId: 'io.eduinsight.client',
    appCopyright: 'Copyright © 2024',
    extraResource: [
      'node_modules/@paymoapp/electron-shutdown-handler/build/Release/PaymoWinShutdownHandler.node',
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupExe: 'EduInsight Client Setup.exe',
      setupIcon: path.resolve(__dirname, 'images/app-icon.ico'),
      loadingGif: path.resolve(__dirname, 'images/setup.gif'),
      ...({
        // Add the shortcuts configuration here
        shortcuts: [
          {
            name: 'EduInsight Client',
            description: 'Launch EduInsight Client',
            target: ['[ROOTDIR]\\EduInsight Client.exe'],
          },
          {
            name: 'EduInsight Dashboard',
            description: 'Open EduInsight Dashboard',
            target: ['[ROOTDIR]\\EduInsight Client.exe', '--dashboard'],
          },
          // Add more shortcuts as needed
        ],
      } as any as MakerSquirrelConfig),
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
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
            js: './src/renderer/windows/splash.tsx',
            name: 'splash_window',
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
