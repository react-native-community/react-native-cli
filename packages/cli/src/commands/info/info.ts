/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-ignore untyped
import getEnvironmentInfo from '../../tools/envinfo';
import {logger, releaseChecker} from '@react-native-community/cli-tools';
import {Config} from '@react-native-community/cli-types';

const info = async function getInfo(_argv: Array<string>, ctx: Config) {
  try {
    logger.info('Fetching system and libraries information...');
    const output = await getEnvironmentInfo(false);
    logger.log(output);
  } catch (err) {
    logger.error(`Unable to print environment info.\n${err}`);
  } finally {
    await releaseChecker(ctx.root);
  }
};

export default {
  name: 'info',
  description: 'Get relevant version info about OS, toolchain and libraries',
  func: info,
};
