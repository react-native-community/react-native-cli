import findPodfilePath from '../findPodfilePath';
import * as projects from '../__fixtures__/projects';

jest.mock('path');
jest.mock('fs');

const fs = require('fs');

describe('ios::findPodfilePath', () => {
  it('returns null if there is no Podfile', () => {
    fs.__setMockFilesystem(projects.withoutPods);
    expect(findPodfilePath(process.cwd(), '')).toBeNull();
  });

  it('returns Podfile path if it exists', () => {
    fs.__setMockFilesystem(projects.withPods);
    expect(findPodfilePath(process.cwd(), '/ios')).toContain('Podfile');
  });
});
