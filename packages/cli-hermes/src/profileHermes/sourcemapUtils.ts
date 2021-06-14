import {Config} from '@react-native-community/cli-types';
import {logger, CLIError, fetch} from '@react-native-community/cli-tools';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {SourceMap} from 'hermes-profile-transformer';
import ip from 'ip';

function getTempFilePath(filename: string) {
  return path.join(os.tmpdir(), filename);
}

function writeJsonSync(targetPath: string, data: any) {
  let json;
  try {
    json = JSON.stringify(data);
  } catch (e) {
    throw new CLIError(
      `Failed to serialize data to json before writing to ${targetPath}`,
      e,
    );
  }

  try {
    fs.writeFileSync(targetPath, json, 'utf-8');
  } catch (e) {
    throw new CLIError(`Failed to write json to ${targetPath}`, e);
  }
}

async function getSourcemapFromServer(
  port?: string,
): Promise<SourceMap | undefined> {
  logger.debug('Getting source maps from Metro packager server');
  const DEBUG_SERVER_PORT = port || '8081';
  const IP_ADDRESS = ip.address();
  const PLATFORM = 'android';

  const requestURL = `http://${IP_ADDRESS}:${DEBUG_SERVER_PORT}/index.map?platform=${PLATFORM}&dev=true`;
  try {
    const {data} = await fetch(requestURL);
    return data as SourceMap;
  } catch (e) {
    logger.debug(`Failed to fetch source map from "${requestURL}"`);
    return undefined;
  }
}

/**
 * Generate a sourcemap by fetching it from a running metro server
 */
export async function generateSourcemap(
  port?: string,
): Promise<string | undefined> {
  // Fetch the source map to a temp directory
  const sourceMapPath = getTempFilePath('index.map');
  const sourceMapResult = await getSourcemapFromServer(port);

  if (sourceMapResult) {
    logger.debug('Using source maps from Metro packager server');
    writeJsonSync(sourceMapPath, sourceMapResult);
    logger.debug(
      `Successfully obtained the source map and stored it in ${sourceMapPath}`,
    );
    return sourceMapPath;
  } else {
    logger.error('Cannot obtain source maps from Metro packager server');
    return undefined;
  }
}

/**
 *
 * @param ctx
 */
export async function findSourcemap(
  ctx: Config,
  port?: string,
): Promise<string | undefined> {
  const intermediateBuildPath = path.join(
    ctx.root,
    'android',
    'app',
    'build',
    'intermediates',
    'sourcemaps',
    'react',
    'debug',
    'index.android.bundle.packager.map',
  );

  const generatedBuildPath = path.join(
    ctx.root,
    'android',
    'app',
    'build',
    'generated',
    'sourcemaps',
    'react',
    'debug',
    'index.android.bundle.map',
  );

  if (fs.existsSync(generatedBuildPath)) {
    logger.debug(`Getting the source map from ${generateSourcemap}`);
    return generatedBuildPath;
  } else if (fs.existsSync(intermediateBuildPath)) {
    logger.debug(`Getting the source map from ${intermediateBuildPath}`);
    return intermediateBuildPath;
  } else {
    return generateSourcemap(port);
  }
}
