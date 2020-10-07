/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {logger} from '@react-native-community/cli-tools';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import path from 'path';
import {
  cleanAssetCatalog,
  getImageSet,
  isCatalogAsset,
  writeImageSet,
} from './assetCatalogIOS';
import {AssetData} from './buildBundle';
import filterPlatformAssetScales from './filterPlatformAssetScales';
import getAssetDestPathAndroid from './getAssetDestPathAndroid';
import getAssetDestPathIOS from './getAssetDestPathIOS';

interface CopiedFiles {
  [src: string]: string;
}

function saveAssets(
  assets: AssetData[],
  platform: string,
  assetsDest: string | undefined,
  assetCatalogDest: string | undefined,
) {
  if (!assetsDest) {
    logger.warn('Assets destination folder is not set, skipping...');
    return;
  }

  const filesToCopy: CopiedFiles = Object.create(null); // Map src -> dest

  const getAssetDestPath =
    platform === 'android' ? getAssetDestPathAndroid : getAssetDestPathIOS;

  const addAssetToCopy = (asset: AssetData) => {
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
  };

  if (platform === 'ios' && assetCatalogDest != null) {
    // Use iOS Asset Catalog for images. This will allow Apple app thinning to
    // remove unused scales from the optimized bundle.
    const catalogDir = path.join(assetCatalogDest, 'RNAssets.xcassets');
    if (!fs.pathExistsSync(catalogDir)) {
      logger.error(
        `Could not find asset catalog 'RNAssets.xcassets' in ${assetCatalogDest}. Make sure to create it if it does not exist.`,
      );
      return;
    }

    logger.info('Adding images to asset catalog', catalogDir);
    cleanAssetCatalog(catalogDir);
    for (const asset of assets) {
      if (isCatalogAsset(asset)) {
        const imageSet = getImageSet(
          catalogDir,
          asset,
          filterPlatformAssetScales(platform, asset.scales),
        );
        writeImageSet(imageSet);
      } else {
        addAssetToCopy(asset);
      }
    }
    logger.info('Done adding images to asset catalog');
  } else {
    assets.forEach(addAssetToCopy);
  }

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
