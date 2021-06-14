import {logger, CLIError} from '@react-native-community/cli-tools';
import {Config} from '@react-native-community/cli-types';
import {downloadProfile} from './downloadProfile';

type Options = {
  filename?: string;
  raw?: boolean;
  sourcemapPath?: string;
  generateSourcemap?: boolean;
  port: string;
  appId?: string;
  appIdSuffix?: string;
};

async function profileHermes(
  [dstPath]: Array<string>,
  ctx: Config,
  options: Options,
) {
  try {
    logger.info(
      'Downloading a Hermes Sampling Profiler from your Android device...',
    );
    if (!options.filename) {
      logger.info('No filename is provided, pulling latest file');
    }
    await downloadProfile(
      ctx,
      dstPath,
      options.filename,
      options.sourcemapPath,
      options.raw,
      options.generateSourcemap,
      options.port,
      options.appId,
      options.appIdSuffix,
    );
  } catch (err) {
    throw err as CLIError;
  }
}

export default {
  name: 'profile-hermes [destinationDir]',
  description:
    'Pull and convert a Hermes tracing profile to Chrome tracing profile, then store it in the directory <destinationDir> of the local machine',
  func: profileHermes,
  options: [
    {
      name: '--filename <string>',
      description:
        'File name of the profile to be downloaded, eg. sampling-profiler-trace8593107139682635366.cpuprofile',
    },
    {
      name: '--raw',
      description:
        'Pulls the original Hermes tracing profile without any transformation',
    },
    {
      name: '--sourcemap-path <string>',
      description:
        'The local path to your source map file, eg. /tmp/sourcemap.json',
    },
    {
      name: '--generate-sourcemap',
      description: 'Generates the JS bundle and source map',
    },
    {
      name: '--port <number>',
      default: `${process.env.RCT_METRO_PORT || 8081}`,
    },
    {
      name: '--appId <string>',
      description:
        'Specify an applicationId to launch after build. If not specified, `package` from AndroidManifest.xml will be used.',
      default: '',
    },
    {
      name: '--appIdSuffix <string>',
      description: 'Specify an applicationIdSuffix to launch after build.',
      default: '',
    },
  ],
  examples: [
    {
      desc:
        'Download the Hermes Sampling Profiler to the directory <destinationDir> on the local machine',
      cmd: 'profile-hermes /tmp',
    },
  ],
};
