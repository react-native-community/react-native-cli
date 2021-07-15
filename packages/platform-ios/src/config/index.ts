/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import path from 'path';
import {memoize} from 'lodash';
import {findPodfile, findXcodeProject} from './findProject';
import findPodspec from './findPodspec';
import isXcodeProject from './isXcodeProject';
import {
  IOSProjectParams,
  IOSDependencyParams,
} from '@react-native-community/cli-types';

const memoizedFindPodfile = memoize(findPodfile);
const memoizedFindProject = memoize(findXcodeProject);

/**
 * For libraries specified without an extension, add '.tbd' for those that
 * start with 'lib' and '.framework' to the rest.
 */
const mapSharedLibaries = (libraries: Array<string>) =>
  libraries.map((name) => {
    if (path.extname(name)) {
      return name;
    }
    return name + (name.indexOf('lib') === 0 ? '.tbd' : '.framework');
  });

/**
 * Returns project config by analyzing given folder and applying some user defaults
 * when constructing final object
 */
export function projectConfig(folder: string, userConfig: IOSProjectParams) {
  if (!userConfig) {
    return;
  }

  const podfile = memoizedFindPodfile(folder);
  const project = userConfig.project || memoizedFindProject(folder);

  /**
   * No iOS config found here
   */
  if (!project && !podfile) {
    return null;
  }

  const projectPath = project && path.join(folder, project);

  // Source files may be referenced from anywhere in a `.xcodeproj`. CocoaPods,
  // on the other hand, is a lot stricter because files cannot live outside the
  // folder in which `Podfile` resides. If we found a `Podfile`, it's a strong
  // indication that source files are in that directory.
  const sourceDir = path.resolve(path.dirname(podfile || projectPath || ''));

  return {
    sourceDir,
    folder,
    pbxprojPath:
      projectPath && isXcodeProject(projectPath)
        ? path.join(projectPath, 'project.pbxproj')
        : null,
    podfile: podfile && path.resolve(podfile),
    podspecPath:
      userConfig.podspecPath ||
      // podspecs are usually placed in the root dir of the library or in the
      // iOS project path
      findPodspec(folder) ||
      findPodspec(sourceDir),
    projectPath,
    projectName: projectPath && path.basename(projectPath),
    libraryFolder: userConfig.libraryFolder || 'Libraries',
    sharedLibraries: mapSharedLibaries(userConfig.sharedLibraries || []),
    plist: userConfig.plist || [],
    scriptPhases: userConfig.scriptPhases || [],
  };
}

export function dependencyConfig(
  folder: string,
  userConfig: IOSDependencyParams,
) {
  const configurations = userConfig.configurations || [];

  const baseConfig = projectConfig(folder, userConfig);
  if (!baseConfig) {
    return null;
  }

  return {...baseConfig, configurations};
}
