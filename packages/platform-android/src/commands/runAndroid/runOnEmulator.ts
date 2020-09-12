/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';
import execa from 'execa';
import {Config} from '@react-native-community/cli-types';
import {logger, CLIError} from '@react-native-community/cli-tools';
import adb from './adb';
import tryRunAdbReverse from './tryRunAdbReverse';
import tryLaunchAppOnDevice from './tryLaunchAppOnDevice';
import {launchAnyEmulator, launchEmulator} from './emulator';
import {Flags} from '.';

function getTaskNames(appName: string, commands: Array<string>): Array<string> {
  return appName ? commands.map(command => `${appName}:${command}`) : commands;
}

function toPascalCase(value: string) {
  return value !== '' ? value[0].toUpperCase() + value.slice(1) : value;
}

type AndroidProject = NonNullable<Config['project']['android']>;

function logStartEmulatorError(error: Error) {
  if (error.message) {
    logger.error(
      `Failed to launch emulator. Reason: ${chalk.dim(error.message)}`,
    );
  } else {
    logger.error('Failed to launch emulator.');
  }

  logger.warn(
    'Please launch an emulator manually or connect a device. Otherwise the app may fail to launch.',
  );
}

async function startEmulator(adbPath: string, deviceName?: string) {
  if (deviceName) {
    logger.info('Launching emulator...');

    try {
      const deviceListAfterEmulatorLaunched = await launchEmulator(
        deviceName,
        adbPath,
      );

      return deviceListAfterEmulatorLaunched;
    } catch (error) {
      return logStartEmulatorError(error);
    }
  }

  const devices = adb.getDevices(adbPath);
  if (devices.length > 0) {
    return devices;
  }

  logger.info('Launching emulator...');

  try {
    const deviceListAfterAnyEmulatorLaunched = await launchAnyEmulator(adbPath);

    return deviceListAfterAnyEmulatorLaunched;
  } catch (error) {
    console.log({error});
    return logStartEmulatorError(error);
  }
}

async function runOnEmulator(
  args: Flags,
  cmd: string,
  packageName: string,
  adbPath: string,
  androidProject: AndroidProject,
  deviceName?: string,
) {
  const devices = await startEmulator(adbPath, deviceName);

  try {
    const tasks = args.tasks || ['install' + toPascalCase(args.variant)];
    const gradleArgs = getTaskNames(
      args.appFolder || androidProject.appName,
      tasks,
    );

    if (args.port != null) {
      gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
    }

    logger.info('Installing the app...');
    logger.debug(
      `Running command "cd android && ${cmd} ${gradleArgs.join(' ')}"`,
    );

    await execa(cmd, gradleArgs, {
      stdio: ['inherit', 'inherit', 'pipe'],
      cwd: androidProject.sourceDir,
    });
  } catch (error) {
    throw createInstallError(error);
  }

  (devices || []).forEach((device: string | void) => {
    tryRunAdbReverse(args.port, device);
    tryLaunchAppOnDevice(device, packageName, adbPath, args);
  });
}

function createInstallError(error: Error & {stderr: string}) {
  const stderr = (error.stderr || '').toString();
  const docs = 'https://reactnative.dev/docs/environment-setup';
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

export default runOnEmulator;
