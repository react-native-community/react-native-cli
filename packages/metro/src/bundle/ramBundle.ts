/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-ignore - no typed definition for the package
import outputUnbundle from 'metro/src/shared/output/RamBundle';
import {withOutput as bundleWithOutput} from './bundle';
import bundleCommandLineArgs, {CommandLineArgs} from './bundleCommandLineArgs';
import type {Config} from '@react-native-community/cli-types';

/**
 * Builds the bundle starting to look for dependencies at the given entry path.
 */
function createRamBundle(
  argv: Array<string>,
  config: Config,
  args: CommandLineArgs,
) {
  return bundleWithOutput(argv, config, args, outputUnbundle);
}

export const ramBundle = {
  name: 'ram-bundle',
  description:
    'builds javascript as a "Random Access Module" bundle for offline use',
  func: createRamBundle,
  options: bundleCommandLineArgs.concat({
    name: '--indexed-ram-bundle',
    description:
      'Force the "Indexed RAM" bundle file format, even when building for android',
    default: false,
  }),
};
