/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import getBuildProperty from './getBuildProperty';

export default function getPlistPath(project, sourceDir) {
  const plistFile = getBuildProperty(project, 'INFOPLIST_FILE');

  if (!plistFile) {
    return null;
  }

  return path.join(
    sourceDir,
    plistFile.replace(/"/g, '').replace('$(SRCROOT)', '')
  );
}
