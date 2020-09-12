/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {execSync, execFileSync} from 'child_process';

/**
 * Parses the output of the 'adb devices' command
 */
function parseDevicesResult(result: string): Array<string> {
  if (!result) {
    return [];
  }

  const devices = [];
  const lines = result.trim().split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const words = lines[i].split(/[ ,\t]+/).filter(w => w !== '');

    if (words[1] === 'device') {
      devices.push(words[0]);
    }
  }
  return devices;
}

/**
 * Executes the commands needed to get a list of devices from ADB
 */
function getDevices(adbPath: string): Array<string> {
  try {
    const devicesResult = execSync(`${adbPath} devices`);
    return parseDevicesResult(devicesResult.toString());
  } catch (e) {
    return [];
  }
}

function getAllAvailableDevices(adbPath: string) {
  const emulators = execFileSync(
    `${process.env.ANDROID_HOME}/emulator/emulator`,
    ['-list-avds'],
    {encoding: 'utf8'},
  )
    .replace(/\n$/, '')
    .split('\n')
    .filter(Boolean)
    .map(emulator => ({
      deviceId: undefined,
      name: emulator,
      type: 'emulator',
    }));

  const physicalDevicesList = execFileSync(adbPath, ['devices', '-l'], {
    encoding: 'utf-8',
  })
    .toString()
    .replace(/\n$/, '')
    .split('\n');

  const modelKey = 'model:';
  const physicalDevices = physicalDevicesList
    .slice(1, physicalDevicesList.length)
    .map((device: string) => {
      if (device.includes('emulator')) {
        return;
      }

      const [deviceId, ...deviceInfo] = device.split(' ');

      if (!deviceId) {
        return;
      }

      const name = deviceInfo
        .find(info => info.includes(modelKey))!
        .replace(modelKey, '');

      return {
        deviceId,
        name,
        type: 'device',
      };
    })
    .filter(Boolean);

  return [...physicalDevices, ...emulators];
}

/**
 * Gets available CPUs of devices from ADB
 */
function getAvailableCPUs(adbPath: string, device: string): Array<string> {
  try {
    const baseArgs = ['-s', device, 'shell', 'getprop'];

    let cpus = execFileSync(
      adbPath,
      baseArgs.concat(['ro.product.cpu.abilist']),
    ).toString();

    // pre-Lollipop
    if (!cpus || cpus.trim().length === 0) {
      cpus = execFileSync(
        adbPath,
        baseArgs.concat(['ro.product.cpu.abi']),
      ).toString();
    }

    return (cpus || '').trim().split(',');
  } catch (e) {
    return [];
  }
}

export default {
  getDevices,
  getAllAvailableDevices,
  getAvailableCPUs,
};
