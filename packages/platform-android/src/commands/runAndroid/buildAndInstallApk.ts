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
import chalk from 'chalk';
import {Config} from '@react-native-community/cli-types';
import {CLIError, logger} from '@react-native-community/cli-tools';
import {Flags} from '.';
import adb from './adb';

type AndroidProject = NonNullable<Config['project']['android']>;

function toPascalCase(value: string) {
  return value !== '' ? value[0].toUpperCase() + value.slice(1) : value;
}

function getTaskNames(appName: string, commands: Array<string>): Array<string> {
  return appName
    ? commands.map((command) => `${appName}:${command}`)
    : commands;
}

function getGradleBaseArgs(
  cmd: string,
  args: Flags,
  androidProject: AndroidProject,
) {
  const tasks = args.tasks || [cmd + toPascalCase(args.variant)];

  return getTaskNames(args.appFolder || androidProject.appName, tasks);
}

export async function buildApk(
  args: Flags,
  gradlew: string,
  androidProject: AndroidProject,
) {
  try {
    const gradleArgs = getGradleBaseArgs('assemble', args, androidProject);

    if (args.port != null) {
      gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
    }

    logger.info('Building the apk...');
    logger.debug(
      `Running command "cd android && ${gradlew} ${gradleArgs.join(' ')}"`,
    );

    await execa(gradlew, gradleArgs, {
      stdio: ['inherit', 'inherit', 'pipe'],
      cwd: androidProject.sourceDir,
    });
  } catch (error) {
    throw new CLIError('Failed to build the apk.', error);
  }
}

export async function installApk(
  args: Flags,
  gradlew: string,
  adbPath: string,
  devices: string[],
  androidProject: AndroidProject,
) {
  let installThroughAdb = true;

  if (devices.length === 0) {
    // No devices were detected, so don't try running ADB
    // instead, gradle will build APK, so consequent run (after device/emu is up) will be faster
    installThroughAdb = false;
  } else {
    for (let device of devices) {
      if (!checkApkFileExists(args, adbPath, device, androidProject)) {
        // one of APK is not build for specific device
        installThroughAdb = false;
      }
    }
  }

  if (installThroughAdb) {
    for (let device of devices) {
      await installApkFromPath(
        adbPath,
        device,
        getApkFilePath(args, adbPath, device, androidProject),
      );
    }
  } else {
    await installApkWithGradle(args, gradlew, androidProject);
  }
}

async function installApkFromPath(
  adbPath: string,
  deviceId: string,
  pathToApk: string,
) {
  try {
    const adbArgs = ['-s', deviceId, 'install', '-r', '-d', pathToApk];
    logger.info(
      `Installing the app on the device "${deviceId}" through adb...`,
    );
    logger.debug(`Running command "cd android && adb ${adbArgs.join(' ')}"`);
    execa.sync(adbPath, adbArgs, {stdio: 'inherit'});
  } catch (error) {
    throw new CLIError(
      `Failed to install the app on the device ${deviceId}.`,
      error,
    );
  }
}

async function installApkWithGradle(
  args: Flags,
  gradlew: string,
  androidProject: AndroidProject,
) {
  try {
    const gradleArgs = getGradleBaseArgs('install', args, androidProject);
    if (args.port != null) {
      gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
    }

    logger.info('Installing the app on the devices through gradle...');
    logger.debug(
      `Running command "cd android && ${gradlew} ${gradleArgs.join(' ')}`,
    );

    await execa(gradlew, gradleArgs, {
      stdio: ['inherit', 'inherit', 'pipe'],
      cwd: androidProject.sourceDir,
    });
  } catch (error) {
    throw createInstallError(error);
  }
}

function checkApkFileExists(
  args: Flags,
  adbPath: string,
  device: string,
  androidProject: AndroidProject,
) {
  try {
    const apkFile = getApkFilePath(args, adbPath, device, androidProject);
    return fs.existsSync(apkFile);
  } catch (_) {
    return false;
  }
}

export function createApkName(
  appName: string,
  buildType: string,
  flavours?: string[] | null,
  cpuArch?: string | null,
) {
  let apkName = `${appName}-`;
  if (flavours) {
    apkName += flavours.reduce((rest, flav) => `${rest}${flav}-`, '');
  }
  if (cpuArch) {
    apkName += `${cpuArch}-`;
  }
  apkName += `${buildType}.apk`;

  return apkName;
}

/* Export for test only */
export function getBuildAndFlavours(variant: string) {
  const regExp = /[A-Z]/;
  const flavours = [];

  let processing = variant;

  function firstLowerCase(text: string) {
    return `${text[0].toLowerCase()}${text.slice(1)}`;
  }

  while (true) {
    const match = processing.match(regExp);

    if (!match) {
      return {
        buildType: processing,
        flavours,
      };
    }

    const foundFlavor = processing.slice(0, match.index);
    flavours.push(foundFlavor.toLowerCase());
    processing = firstLowerCase(processing.slice(match.index));
  }
}

/* Export for test only */
function getApkFilePath(
  args: Flags,
  adbPath: string,
  device: string,
  androidProject: AndroidProject,
) {
  let buildType = args.variant;
  let appName = androidProject.appName;
  let flavours: string[] = [];

  let buildDirectory = `${androidProject.sourceDir}/${
    args.appFolder || appName
  }/build/outputs/apk/`;

  const realVariant = buildType.match(/[A-Z]/);

  /*
    Argument --variant can be a "real" variant or just build type.
    Real variant is a combination of flavour dimension and build type, ex. demoDebug.
    APK name changes if flavors come into play.
   */
  if (realVariant) {
    buildType = getBuildAndFlavours(args.variant).buildType;
    flavours = getBuildAndFlavours(args.variant).flavours;
    buildDirectory = path.join(buildDirectory, ...flavours, buildType);
  } else {
    buildDirectory = path.join(buildDirectory, buildType);
  }

  const availableCPUs = adb.getAvailableCPUs(adbPath, device);

  // check if there is an apk file like app-armeabi-v7a-debug.apk
  for (const availableCPU of availableCPUs.concat('universal')) {
    const apkName = createApkName(appName, buildType, flavours, availableCPU);
    if (fs.existsSync(`${buildDirectory}/${apkName}`)) {
      return `${buildDirectory}/${apkName}`;
    }
  }

  // check if there is a default file like app-debug.apk
  const apkName = createApkName(appName, buildType, flavours);
  if (fs.existsSync(`${buildDirectory}/${apkName}`)) {
    return `${buildDirectory}/${apkName}`;
  }

  throw new CLIError(`Could not find the correct install APK file: ${apkName}`);
}

function createInstallError(error: Error & {stderr: string}) {
  const stderr = (error.stderr || '').toString();
  const docs =
    'https://reactnative.dev/docs/getting-started.html#android-development-environment';
  let message = `Make sure you have the Android development environment set up: ${chalk.underline.dim(
    docs,
  )}`;

  // Pass the error message from the command to stdout because we pipe it to
  // parent process so it's not visible
  logger.log(stderr);

  // Handle some common failures and make the errors more helpful
  if (stderr.includes('No connected devices')) {
    message =
      'Make sure you have an Android emulator running or a device connected';
  } else if (
    stderr.includes('licences have not been accepted') ||
    stderr.includes('accept the SDK license')
  ) {
    message = `Please accept all necessary Android SDK licenses using Android SDK Manager: "${chalk.bold(
      '$ANDROID_HOME/tools/bin/sdkmanager --licenses',
    )}"`;
  }

  return new CLIError(`Failed to install the app. ${message}.`, error);
}
