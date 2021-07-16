/**
 * This is an implementation of a metro resolveRequest option which will remap react-native imports
 * to different npm packages based on the platform requested.  This allows a single metro instance/config
 * to produce bundles for multiple out of tree platforms at a time.
 *
 * @param platformImplementations
 * A map of platform to npm package that implements that platform
 *
 * Ex:
 * {
 *    windows: 'react-native-windows'
 *    macos: 'react-native-macos'
 * }
 */
// @ts-ignore - no typed definition for the package
import {resolve} from 'metro-resolver';

export function reactNativePlatformResolver(platformImplementations: {
  [platform: string]: string;
}) {
  return (
    context: any,
    _realModuleName: string,
    platform: string,
    moduleName: string,
  ) => {
    let backupResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    try {
      let modifiedModuleName = moduleName;
      if (platformImplementations[platform]) {
        if (moduleName === 'react-native') {
          modifiedModuleName = platformImplementations[platform];
        } else if (moduleName.startsWith('react-native/')) {
          modifiedModuleName = `${
            platformImplementations[platform]
          }/${modifiedModuleName.slice('react-native/'.length)}`;
        }
      }
      let result = resolve(context, modifiedModuleName, platform);
      return result;
    } catch (e) {
      throw e;
    } finally {
      context.resolveRequest = backupResolveRequest;
    }
  };
}
