import chalk from 'chalk';
import {logger} from '@react-native-community/cli-tools';
import {Config} from '@react-native-community/cli-types';
import getLinkConfig from './index';

// TODO: move to cli-tools once platform-ios and platform-android are migrated
// to TS and unify with Android implementation
export default function warnAboutManuallyLinkedLibs(
  config: Config,
  platform: string = 'ios',
  linkConfig: ReturnType<
    Config['platforms']['ios']['linkConfig']
  > = getLinkConfig(),
) {
  const projectConfig = config.project[platform];
  if (projectConfig.pbxprojPath === null) {
    return;
  }

  let deps: Array<string> = [];

  for (let key in config.dependencies) {
    const dependency = config.dependencies[key];

    const dependencyConfig = dependency.platforms[platform];
    if (projectConfig && dependencyConfig) {
      const x = linkConfig.isInstalled(
        projectConfig,
        dependency.name,
        dependencyConfig,
      );
      deps = deps.concat(x ? dependency.name : []);
    }
  }

  const installedModules = [...new Set(deps)];

  if (installedModules.length) {
    logger.error(
      `React Native CLI uses autolinking for native dependencies, but the following modules are linked manually: \n${installedModules
        .map(
          (x) =>
            `  - ${chalk.bold(x)} ${chalk.dim(
              `(to unlink run: "react-native unlink ${x}")`,
            )}`,
        )
        .join(
          '\n',
        )}\nThis is likely happening when upgrading React Native from below 0.60 to 0.60 or above. Going forward, you can unlink this dependency via "react-native unlink <dependency>" and it will be included in your app automatically. If a library isn't compatible with autolinking, disregard this message and notify the library maintainers.\nRead more about autolinking: ${chalk.dim.underline(
        'https://github.com/react-native-community/cli/blob/master/docs/autolinking.md',
      )}`,
    );
  }
}
