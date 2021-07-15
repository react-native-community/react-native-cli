import fs from 'fs';
import path from 'path';
import {promisify} from 'util';

const readdir = promisify(fs.readdir);

export async function getDirectoryFilesRecursive(
  dir: string,
  startDir?: string,
): Promise<string[]> {
  const entries = await readdir(dir, {
    withFileTypes: true,
  });

  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => dir + file.name);
  const subdirs = entries
    .filter((folder) => folder.isDirectory())
    .map((folder) => folder.name);

  for (const subdir of subdirs) {
    files.push(
      ...(await getDirectoryFilesRecursive(
        path.join(dir, subdir),
        startDir ?? dir,
      )),
    );
  }

  return files.map((file) => file.replace(startDir ?? dir, ''));
}
