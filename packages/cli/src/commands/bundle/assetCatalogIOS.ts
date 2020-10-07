/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import fs from 'fs-extra';
import assetPathUtils from './assetPathUtils';
import {AssetData} from './buildBundle';

export function cleanAssetCatalog(catalogDir: string): void {
  const files = fs
    .readdirSync(catalogDir)
    .filter((file) => file.endsWith('.imageset'));
  for (const file of files) {
    fs.removeSync(path.join(catalogDir, file));
  }
}

type ImageSet = {
  basePath: string;
  files: {name: string; src: string; scale: number}[];
};

export function getImageSet(
  catalogDir: string,
  asset: AssetData,
  scales: readonly number[],
): ImageSet {
  const fileName = assetPathUtils.getResourceIdentifier(asset);
  return {
    basePath: path.join(catalogDir, `${fileName}.imageset`),
    files: scales.map((scale, idx) => {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      return {
        name: `${fileName + suffix}.${asset.type}`,
        scale,
        src: asset.files[idx],
      };
    }),
  };
}

export function isCatalogAsset(asset: AssetData): boolean {
  return asset.type === 'png' || asset.type === 'jpg' || asset.type === 'jpeg';
}

export function writeImageSet(imageSet: ImageSet): void {
  fs.mkdirsSync(imageSet.basePath);

  for (const file of imageSet.files) {
    const dest = path.join(imageSet.basePath, file.name);
    fs.copyFileSync(file.src, dest);
  }

  fs.writeJSONSync(path.join(imageSet.basePath, 'Contents.json'), {
    images: imageSet.files.map((file) => ({
      filename: file.name,
      idiom: 'universal',
      scale: `${file.scale}x`,
    })),
    info: {
      author: 'xcode',
      version: 1,
    },
  });
}
