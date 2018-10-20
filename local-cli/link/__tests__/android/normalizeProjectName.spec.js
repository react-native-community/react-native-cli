/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * All rights reserved.
 *
 * @format
 * @emails oncall+javascript_foundation
 */

const normalizeProjectName = require('../../android/patches/normalizeProjectName');

const name = 'test';
const scopedName = '@scoped/test';

describe('normalizeProjectName', () => {
  it('should replace slashes with underscores', () => {
    expect(normalizeProjectName(name)).toBe('test');
    expect(normalizeProjectName(scopedName)).toBe('@scoped_test');
  });
});
