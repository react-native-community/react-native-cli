/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import runOnEmulator from '../runOnEmulator';
import execa from 'execa';

jest.mock('execa');
jest.mock('../getAdbPath');
jest.mock('../emulator');

describe('--appFolder', () => {
  const args = {
    root: '/root',
    appFolder: undefined,
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses task "install[Variant]" as default task', async () => {
    await runOnEmulator(
      {...args, variant: 'debug'},
      './gradlew',
      'com.testapp',
      'adb',
      androidProject,
    );
    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'app:installDebug',
    );
  });

  it('uses appName and default variant', async () => {
    await runOnEmulator(
      {...args, variant: 'debug'},
      './gradlew',
      'com.testapp',
      'adb',
      {...androidProject, appName: 'someApp'},
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'someApp:installDebug',
    );
  });

  it('uses appName and custom variant', async () => {
    await runOnEmulator(
      {...args, variant: 'staging'},
      './gradlew',
      'com.testapp',
      'adb',
      {...androidProject, appName: 'anotherApp'},
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'anotherApp:installStaging',
    );
  });

  it('uses appFolder and default variant', async () => {
    await runOnEmulator(
      {...args, appFolder: 'someApp', variant: 'debug'},
      './gradlew',
      'com.testapp',
      'adb',
      androidProject,
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'someApp:installDebug',
    );
  });

  it('uses appFolder and custom variant', async () => {
    await runOnEmulator(
      {...args, appFolder: 'anotherApp', variant: 'staging'},
      './gradlew',
      'com.testapp',
      'adb',
      androidProject,
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'anotherApp:installStaging',
    );
  });

  it('uses only task argument', async () => {
    await runOnEmulator(
      {...args, tasks: ['someTask']},
      './gradlew',
      'com.testapp',
      'adb',
      androidProject,
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'app:someTask',
    );
  });

  it('uses appName and custom task argument', async () => {
    await runOnEmulator(
      {...args, tasks: ['someTask']},
      './gradlew',
      'com.testapp',
      'adb',
      {...androidProject, appName: 'anotherApp'},
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'anotherApp:someTask',
    );
  });

  it('uses appFolder and custom task argument', async () => {
    await runOnEmulator(
      {...args, appFolder: 'anotherApp', tasks: ['someTask'], variant: 'debug'},
      './gradlew',
      'com.testapp',
      'adb',
      {...androidProject, appName: 'anotherApp'},
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toContain(
      'anotherApp:someTask',
    );
  });

  it('uses multiple tasks', async () => {
    await runOnEmulator(
      {...args, tasks: ['clean', 'someTask']},
      './gradlew',
      'com.testapp',
      'adb',
      androidProject,
    );

    expect(((execa as unknown) as jest.Mock).mock.calls[0][1]).toEqual([
      'app:clean',
      'app:someTask',
      '-PreactNativeDevServerPort=8081',
    ]);
  });
});
