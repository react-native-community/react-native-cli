/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import glob from 'glob';
import path from 'path';
import isXcodeProject from './isXcodeProject';

/**
 * Glob pattern to look for xcodeproj
 */
const GLOB_PATTERN = '**/*.{xcodeproj,xcworkspace}';

/**
 * Regexp matching all test projects
 */
const TEST_PROJECTS = /test|example|sample/i;

/**
 * Base iOS folder
 */
const IOS_BASE = 'ios';

/**
 * These folders will be excluded from search to speed it up
 */
const GLOB_EXCLUDE_PATTERN = ['**/@(Pods|node_modules|Carthage)/**'];

function findProject(folder: string, pattern: string): string[] {
  return glob
    .sync(pattern, {
      cwd: folder,
      ignore: GLOB_EXCLUDE_PATTERN,
    })
    .filter(
      (project) =>
        path.dirname(project) === IOS_BASE || !TEST_PROJECTS.test(project),
    )
    .sort((project) => (path.dirname(project) === IOS_BASE ? -1 : 1));
}

/**
 * Finds a `Podfile` in given folder.
 *
 * Returns first match if files are found or null
 *
 * Note: `./ios/Podfile` are returned regardless of the name
 */
export function findPodfile(folder: string): string | null {
  const projects = findProject(folder, '**/Podfile');
  if (projects.length === 0) {
    return null;
  }

  return projects[0];
}

/**
 * Finds iOS project by looking for all .xcodeproj files
 * in given folder.
 *
 * Returns first match if files are found or null
 *
 * Note: `./ios/*.xcodeproj` are returned regardless of the name
 */
export function findXcodeProject(folder: string): string | null {
  const projects = findProject(folder, GLOB_PATTERN);
  if (projects.length === 0) {
    return null;
  }

  return projects.find(isXcodeProject) || projects[0];
}
