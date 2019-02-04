/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const chalk = require('chalk');
const { execFileSync } = require('child_process');
const logger = require('../util/logger');
const getAdbPath = require('./getAdbPath');

// Runs ADB reverse tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
function tryRunAdbReverse(packagerPort: number | string, device: string) {
  try {
    const adbPath = getAdbPath();
    const adbArgs = ['reverse', `tcp:${packagerPort}`, `tcp:${packagerPort}`];

    // If a device is specified then tell adb to use it
    if (device) {
      adbArgs.unshift('-s', device);
    }

    logger.info(chalk.bold(`Running ${adbPath} ${adbArgs.join(' ')}`));

    execFileSync(adbPath, adbArgs, {
      stdio: [process.stdin, process.stdout, process.stderr],
    });
  } catch (e) {
    logger.info(`Could not run adb reverse: ${e.message}`);
  }
}

module.exports = tryRunAdbReverse;
