/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs';
import path from 'path';
import execa from 'execa';
import {Config} from '@react-native-community/cli-types';

import {
  buildApk,
  installApk,
  createApkName,
  getBuildAndFlavours,
} from '../buildAndInstallApk';
import {Flags} from '../index';

type AndroidProject = NonNullable<Config['project']['android']>;

jest.mock('execa');
jest.mock('fs');
jest.mock('path');

describe('apk', () => {
  const args = {
    root: '/root',
    appFolder: '',
    appId: '',
    tasks: undefined,
    variant: 'debug',
    appIdSuffix: '',
    mainActivity: 'MainActivity',
    deviceId: undefined,
    packager: true,
    port: 8081,
    terminal: 'iTerm2',
    jetifier: true,
  };
  const androidProject = {
    manifestPath: '/android/app/src/main/AndroidManifest.xml',
    appName: 'app',
    packageName: 'com.test',
    sourceDir: '/android',
    isFlat: false,
    folder: '',
    stringsPath: '',
    buildGradlePath: '',
    settingsGradlePath: '',
    assetsPath: '',
    mainFilePath: '',
    packageFolder: '',
  };

  const adb = 'path/to/adb';
  const gradle = './gradlew';

  function createTestEnv(androProject: AndroidProject, flags: Flags) {
    const androidSource = androProject.sourceDir;
    const buildDir = `${
      flags.appFolder || androProject.appName
    }/build/outputs/apk/${flags.variant}`;
    const apkName = `app-${flags.variant}.apk`;

    fs.mkdirSync(androidSource);

    // create buildDir recursively
    buildDir.split('/').reduce((currentPath, dir) => {
      fs.mkdirSync(path.join(androidSource, `${currentPath}/${dir}`));
      return `${currentPath}/${dir}`;
    }, '');

    fs.writeFileSync(path.resolve(androidSource, buildDir, apkName), '');

    return {
      source: androidSource,
      apkDir: path.resolve(androidSource, buildDir),
      apkPath: path.resolve(androidSource, buildDir, apkName),
    };
  }

  afterEach(() => {
    jest.clearAllMocks();

    fs.mock.clear('posix');
  });

  describe('buildApk', () => {
    it('uses default assembleDebug task', async () => {
      await buildApk(args, gradle, androidProject);

      const calls = ((execa as unknown) as jest.Mock).mock.calls;

      expect(calls[0][1]).toEqual([
        'app:assembleDebug',
        '-PreactNativeDevServerPort=8081',
      ]);
    });

    it.each([
      ['Debug', 'app'],
      ['Production', 'myApp'],
    ])('uses assemble task for %s variant', async (variant, appName) => {
      const testArgs = {
        ...args,
        variant,
      };
      const testProject = {
        ...androidProject,
        appName,
      };

      await buildApk(testArgs, gradle, testProject);

      expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toEqual([
        `${appName}:assemble${variant}`,
        '-PreactNativeDevServerPort=8081',
      ]);
    });
  });
  describe('installApk', () => {
    it('runs default installDebug task if APK is not build', async () => {
      const sources = createTestEnv(androidProject, args);

      fs.unlinkSync(sources.apkPath);

      await installApk(args, gradle, adb, [], {
        ...androidProject,
        sourceDir: sources.source,
      });

      const calls = ((execa as unknown) as jest.Mock).mock.calls;

      expect(calls[0][0]).toContain(gradle);
      expect(calls[0][1]).toContain('app:installDebug');
    });

    it('installs already built apk through adb', async () => {
      const sources = createTestEnv(androidProject, args);

      await installApk(args, gradle, adb, ['emu-1'], {
        ...androidProject,
        sourceDir: sources.source,
      });

      const calls = ((execa.sync as unknown) as jest.Mock).mock.calls;

      expect(calls[0][0]).toContain('adb');
      expect(calls[0][1]).toContain(sources.apkPath);
      expect(calls[0][1]).toContain('emu-1');
    });
    it.each([
      ['Debug', 'app'],
      ['Production', 'myApp'],
    ])(
      'installs APK through gradle for %s variant',
      async (variant: string, appName: string) => {
        const testArgs = {
          ...args,
          variant,
        };
        const testProject = {
          ...androidProject,
          appName,
        };

        const sources = createTestEnv(testProject, testArgs);

        fs.unlinkSync(sources.apkPath);

        await installApk(testArgs, gradle, adb, [], testProject);

        const calls = ((execa as unknown) as jest.Mock).mock.calls;

        expect(calls[0][0]).toContain(gradle);
        expect(calls[0][1]).toContain(`${appName}:install${variant}`);
      },
    );
  });

  describe('build/install utilities', () => {
    it.each([
      ['app-demo-free-debug.apk', 'app', 'debug', ['demo', 'free'], null],
      ['app-debug.apk', 'app', 'debug', [], null],
      ['dev-global-release.apk', 'dev', 'release', ['global'], null],
      [
        'other-super-max-x86-production.apk',
        'other',
        'production',
        ['super', 'max'],
        'x86',
      ],
    ])(
      'builds %s apk file name',
      (apkFile, appName, buildType, flavours, cpu) => {
        const generatedName = createApkName(appName, buildType, flavours, cpu);
        expect(generatedName).toEqual(apkFile);
      },
    );

    it.each([
      ['demoRelease', {buildType: 'release', flavours: ['demo']}],
      ['demoFreeDebug', {buildType: 'debug', flavours: ['demo', 'free']}],
      ['localGoogleDebug', {buildType: 'debug', flavours: ['local', 'google']}],
      [
        'mixingVeryLongFlavsProduction',
        {
          buildType: 'production',
          flavours: ['mixing', 'very', 'long', 'flavs'],
        },
      ],
      ['debug', {buildType: 'debug', flavours: []}],
    ])(
      'reads proper build type and flavours for variant %s',
      (variant, result) => {
        const config = getBuildAndFlavours(variant);
        expect(config).toEqual(result);
      },
    );
  });
});
