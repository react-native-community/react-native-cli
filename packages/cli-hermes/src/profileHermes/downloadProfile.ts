import {Config} from '@react-native-community/cli-types';
import {execSync} from 'child_process';
import {logger, CLIError} from '@react-native-community/cli-tools';
import fs from 'fs';
import path from 'path';
import os from 'os';
import transformer from 'hermes-profile-transformer';
import {findSourcemap, generateSourcemap} from './sourcemapUtils';
import {
  getAndroidProject,
  getPackageName,
} from '@react-native-community/cli-platform-android';
/**
 * Get the last modified hermes profile
 * @param packageName
 */
function getLatestFile(packageName: string): string {
  try {
    const file = execSync(`adb shell run-as ${packageName} ls cache/ -tp | grep -v /$ | grep -E '.cpuprofile' | head -1
        `);
    return file.toString().trim();
  } catch (e) {
    throw new Error(e);
  }
}

function execSyncWithLog(command: string) {
  logger.debug(`${command}`);
  return execSync(command);
}

/**
 * Pull and convert a Hermes tracing profile to Chrome tracing profile
 * @param ctx
 * @param dstPath
 * @param fileName
 * @param sourceMapPath
 * @param raw
 * @param generateSourceMap
 * @param appId
 * @param appIdSuffix
 */
export async function downloadProfile(
  ctx: Config,
  dstPath: string,
  filename?: string,
  sourcemapPath?: string,
  raw?: boolean,
  shouldGenerateSourcemap?: boolean,
  port?: string,
  appId?: string,
  appIdSuffix?: string,
) {
  try {
    const androidProject = getAndroidProject(ctx);
    const packageName = getPackageName(androidProject);
    const packageNameWithSuffix = [appId || packageName, appIdSuffix]
      .filter(Boolean)
      .join('.');

    // If file name is not specified, pull the latest file from device
    const file = filename || getLatestFile(packageNameWithSuffix);
    if (!file) {
      throw new CLIError(
        'There is no file in the cache/ directory. Did you record a profile from the developer menu?',
      );
    }

    logger.info(`File to be pulled: ${file}`);

    // If destination path is not specified, pull to the current directory
    dstPath = dstPath || ctx.root;

    logger.debug('Internal commands run to pull the file:');

    // Copy the file from device's data to sdcard, then pull the file to a temp directory
    execSyncWithLog(
      `adb shell run-as ${packageNameWithSuffix} cp cache/${file} /sdcard`,
    );

    // If --raw, pull the hermes profile to dstPath
    if (raw) {
      execSyncWithLog(`adb pull /sdcard/${file} ${dstPath}`);
      logger.success(`Successfully pulled the file to ${dstPath}/${file}`);
    }

    // Else: transform the profile to Chrome format and pull it to dstPath
    else {
      const osTmpDir = os.tmpdir();
      const tempFilePath = path.join(osTmpDir, file);

      execSyncWithLog(`adb pull /sdcard/${file} ${tempFilePath}`);

      // If path to source map is not given
      if (!sourcemapPath) {
        // Get or generate the source map
        if (shouldGenerateSourcemap) {
          sourcemapPath = await generateSourcemap(port);
        } else {
          sourcemapPath = await findSourcemap(ctx, port);
        }

        // Run without source map
        if (!sourcemapPath) {
          logger.warn(
            'Cannot find source maps, running the transformer without it',
          );
          logger.info(
            'Instructions on how to get source maps: set `bundleInDebug: true` in your app/build.gradle file, inside the `project.ext.react` map.',
          );
        }
      }

      // Run transformer tool to convert from Hermes to Chrome format
      const events = await transformer(
        tempFilePath,
        sourcemapPath,
        'index.bundle',
      );

      const transformedFilePath = `${dstPath}/${path.basename(
        file,
        '.cpuprofile',
      )}-converted.json`;
      fs.writeFileSync(
        transformedFilePath,
        JSON.stringify(events, undefined, 4),
        'utf-8',
      );
      logger.success(
        `Successfully converted to Chrome tracing format and pulled the file to ${transformedFilePath}`,
      );
    }
  } catch (e) {
    throw e;
  }
}
