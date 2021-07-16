import fs from 'fs';
import path from 'path';
import DirectoryContainsConflictingFilesError from './errors/DirectoryContainsConflictingFilesError';

const validFiles = [
  '.DS_Store',
  '.git',
  '.gitattributes',
  '.gitignore',
  '.gitlab-ci.yml',
  '.hg',
  '.hgcheck',
  '.hgignore',
  '.idea',
  '.npmignore',
  '.travis.yml',
  'docs',
  'LICENSE',
  'README.md',
  'mkdocs.yml',
  'Thumbs.db',
];

export function validateProjectDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const conflicts = fs
    .readdirSync(directory)
    .filter((file) => {
      return (
        !validFiles.includes(file) &&
        // IntelliJ IDEA creates module files before CRA is launched
        !/\.iml$/.test(file)
      );
    })
    .map((file) => {
      const stats = fs.lstatSync(path.join(directory, file));
      return `${file}${stats.isDirectory() ? '/' : ''}`;
    });

  if (conflicts.length > 0) {
    throw new DirectoryContainsConflictingFilesError(directory, conflicts);
  }
}
