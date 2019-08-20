import nodeJS from './nodeJS';
import {yarn, npm} from './packageManagers';
import watchman from './watchman';
import androidHomeEnvVariable from './androidHomeEnvVariable';
import androidSDK from './androidSDK';
import androidNDK from './androidNDK';
import xcode from './xcode';
import cocoaPods from './cocoaPods';
import iosDeploy from './iosDeploy';

const healthchecks = {
  common: {
    label: 'Common',
    healthchecks: [nodeJS, yarn, npm, watchman],
  },
  android: {
    label: 'Android',
    // TODO: Android NDK should be shown only with a special flag
    healthchecks: [androidHomeEnvVariable, androidSDK, androidNDK],
  },
  ...(process.platform === 'darwin'
    ? {
        ios: {
          label: 'iOS',
          healthchecks: [xcode, cocoaPods, iosDeploy],
        },
      }
    : {}),
};

export default healthchecks;
