/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @emails oncall+javascript_foundation
 */

const xcode = require('xcode');
const path = require('path');
const getProducts = require('../../ios/getProducts');

const project = xcode.project(
  path.join(__dirname, '../../__fixtures__/project.pbxproj')
);

describe('ios::getProducts', () => {
  beforeEach(() => {
    project.parseSync();
  });

  it('should return an array of static libraries project exports', () => {
    const products = getProducts(project);
    expect(products).toHaveLength(1);
    expect(products).toContain('libRCTActionSheet.a');
  });
});
