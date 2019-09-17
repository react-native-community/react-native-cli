import execa from 'execa';
import chalk from 'chalk';
// @ts-ignore untyped
import inquirer from 'inquirer';
import {checkSoftwareInstalled, PACKAGE_MANAGERS} from '../checkInstallation';
import {packageManager} from './packageManagers';
import {logManualInstallation, removeMessage} from './common';
import {HealthCheckInterface} from '../types';
import {Ora} from 'ora';

const label = 'ios-deploy';

const installationWithYarn = 'yarn global add ios-deploy';
const installationWithNpm = 'npm install ios-deploy --global';

const identifyInstallationCommand = () => {
  if (packageManager === PACKAGE_MANAGERS.YARN) {
    return installationWithYarn;
  }

  if (packageManager === PACKAGE_MANAGERS.NPM) {
    return installationWithNpm;
  }

  return undefined;
};

const installLibrary = async ({
  installationCommand,
  packageManagerToUse,
  loader,
}: {
  installationCommand: string;
  packageManagerToUse: 'yarn' | 'npm';
  loader: Ora;
}) => {
  try {
    loader.start(`${label} (installing with ${packageManagerToUse})`);

    const installationCommandArgs = installationCommand.split(' ');

    await execa(installationCommandArgs[0], installationCommandArgs.splice(1));

    loader.succeed(`${label} (installed with ${packageManagerToUse})`);
  } catch (_error) {
    loader.fail();

    logManualInstallation({
      healthcheck: 'ios-deploy',
      command: installationCommand,
    });
  }
};

export default {
  label,
  isRequired: false,
  getDiagnostics: async () => ({
    needsToBeFixed: await checkSoftwareInstalled('ios-deploy'),
  }),
  runAutomaticFix: async ({loader}) => {
    loader.stop();

    const installationCommand = identifyInstallationCommand();

    // This means that we couldn't "guess" the package manager
    if (installationCommand === undefined) {
      const promptQuestion = `ios-deploy needs to be installed either by ${chalk.bold(
        'yarn',
      )} ${chalk.reset('or')} ${chalk.bold(
        'npm',
      )} ${chalk.reset()}, which one do you want to use?`;
      const installWithYarn = 'yarn';
      const installWithNpm = 'npm';
      const skipInstallation = 'Skip installation';

      const {whichPackageManagerToUse} = await inquirer.prompt([
        {
          type: 'list',
          name: 'whichPackageManagerToUse',
          message: promptQuestion,
          choices: [installWithYarn, installWithNpm, skipInstallation],
        },
      ]);

      removeMessage(`? ${promptQuestion} ${whichPackageManagerToUse}`);

      if (whichPackageManagerToUse === skipInstallation) {
        loader.fail();

        // Then we just print out the URL that the user can head to download the library
        return logManualInstallation({
          healthcheck: 'ios-deploy',
          url: 'https://github.com/ios-control/ios-deploy#readme',
        });
      }

      const shouldInstallWithYarn =
        whichPackageManagerToUse === installWithYarn;

      return installLibrary({
        installationCommand: shouldInstallWithYarn
          ? installationWithYarn
          : installationWithNpm,
        loader,
        packageManagerToUse: whichPackageManagerToUse,
      });
    }

    return installLibrary({
      installationCommand,
      packageManagerToUse: packageManager!.toLowerCase() as 'yarn' | 'npm',
      loader,
    });
  },
} as HealthCheckInterface;
