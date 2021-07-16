import path from 'path';
import logger from '../logger';
// @ts-ignore - JS file
import resolveNodeModuleDir from '../resolveNodeModuleDir';
import getLatestRelease from './getLatestRelease';
import printNewRelease from './printNewRelease';

export default async function releaseChecker(root: string) {
  try {
    const {version: currentVersion} = require(path.join(
      resolveNodeModuleDir(root, 'react-native'),
      'package.json',
    ));
    const {name} = require(path.join(root, 'package.json'));
    const latestRelease = await getLatestRelease(name, currentVersion);

    if (latestRelease) {
      printNewRelease(name, latestRelease, currentVersion);
    }
  } catch (e) {
    // We let the flow continue as this component is not vital for the rest of
    // the CLI.
    logger.debug(
      'Cannot detect current version of React Native, ' +
        'skipping check for a newer release',
    );
    logger.debug(e);
  }
}
