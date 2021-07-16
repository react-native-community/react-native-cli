/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs';

import filterPlatformAssetScales from './filterPlatformAssetScales';
import getAssetDestPathAndroid from './getAssetDestPathAndroid';
import getAssetDestPathIOS from './getAssetDestPathIOS';
import {logger} from '@react-native-community/cli-tools';
import {AssetData} from './buildBundle';

interface CopiedFiles {
  [src: string]: string;
}

function saveAssets(
  assets: AssetData[],
  platform: string,
  assetsDest: string | undefined,
) {
  if (!assetsDest) {
    logger.warn('Assets destination folder is not set, skipping...');
    return Promise.resolve();
  }

  const getAssetDestPath =
    platform === 'android' ? getAssetDestPathAndroid : getAssetDestPathIOS;

  const filesToCopy: CopiedFiles = Object.create(null); // Map src -> dest
  assets.forEach((asset) => {
    const validScales = new Set(
      filterPlatformAssetScales(platform, asset.scales),
    );
    asset.scales.forEach((scale, idx) => {
      if (!validScales.has(scale)) {
        return;
      }
      const src = asset.files[idx];
      const dest = path.join(assetsDest, getAssetDestPath(asset, scale));
      filesToCopy[src] = dest;
    });
  });

  return copyAll(filesToCopy);
}

function copyAll(filesToCopy: CopiedFiles) {
  const queue = Object.keys(filesToCopy);
  if (queue.length === 0) {
    return Promise.resolve();
  }

  logger.info(`Copying ${queue.length} asset files`);
  return new Promise((resolve, reject) => {
    const copyNext = (error?: NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
        return;
      }
      if (queue.length === 0) {
        logger.info('Done copying assets');
        resolve();
      } else {
        // queue.length === 0 is checked in previous branch, so this is string
        const src = queue.shift() as string;
        const dest = filesToCopy[src];
        copy(src, dest, copyNext);
      }
    };
    copyNext();
  });
}

function copy(
  src: string,
  dest: string,
  callback: (error: NodeJS.ErrnoException) => void,
): void {
  const destDir = path.dirname(dest);
  mkdirp(destDir, (err?: NodeJS.ErrnoException) => {
    if (err) {
      callback(err);
      return;
    }
    fs.createReadStream(src)
      .pipe(fs.createWriteStream(dest))
      .on('finish', callback);
  });
}

export default saveAssets;
