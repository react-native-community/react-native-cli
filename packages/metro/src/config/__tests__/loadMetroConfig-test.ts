import {getDefaultConfig} from '../loadMetroConfig';

jest.mock('fs');
jest.mock('path');

describe('getDefaultConfig', () => {
  it('should preserve transformer.allowOptionalDependencies=true when overriding other transformer options', async () => {
    const config = getDefaultConfig({
      root: '/',
      reactNativePath: '',
      // @ts-ignore
      platforms: {},
    });

    expect(config.transformer.allowOptionalDependencies).toBe(true);
  });
});
