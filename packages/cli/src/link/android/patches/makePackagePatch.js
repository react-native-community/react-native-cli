/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import applyParams from './applyParams';

export default function makePackagePatch(packageInstance, params, prefix) {
  const processedInstance = applyParams(packageInstance, params, prefix);

  return {
    pattern: 'new MainReactPackage()',
    patch: `,\n            ${processedInstance}`,
  };
}
