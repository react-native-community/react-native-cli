import fs from 'fs';
import path from 'path';
import {logger} from '@react-native-community/cli-tools';
import walk from '../../tools/walk';

interface PlaceholderConfig {
  projectName: string;
  placeholderName: string;
  placeholderTitle?: string;
  projectTitle?: string;
}

/**
  TODO: This is a default placeholder for title in react-native template.
  We should get rid of this once custom templates adapt `placeholderTitle` in their configurations.
*/
const DEFAULT_TITLE_PLACEHOLDER = 'Hello App Display Name';

function replaceNameInUTF8File(
  filePath: string,
  projectName: string,
  templateName: string,
) {
  logger.debug(`Replacing in ${filePath}`);
  const isPackageJson = path.basename(filePath) === 'package.json';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replace(new RegExp(templateName, 'g'), projectName)
    .replace(
      new RegExp(templateName.toLowerCase(), 'g'),
      projectName.toLowerCase(),
    );

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }

  if (isPackageJson) {
    fs.writeFileSync(
      filePath,
      fileContent.replace(templateName, projectName.toLowerCase()),
      'utf8',
    );
  }
}

function renameFile(filePath: string, oldName: string, newName: string) {
  const newFileName = path.join(
    path.dirname(filePath),
    path.basename(filePath).replace(new RegExp(oldName, 'g'), newName),
  );

  logger.debug(`Renaming ${filePath} -> file:${newFileName}`);

  if (!fs.existsSync(newFileName)) {
    fs.renameSync(filePath, newFileName);
  }
}

function shouldRenameFile(filePath: string, nameToReplace: string) {
  return path.basename(filePath).includes(nameToReplace);
}

function shouldIgnoreFile(filePath: string) {
  return filePath.match(/node_modules|yarn.lock|package-lock.json/g);
}

const UNDERSCORED_DOTFILES = [
  'buckconfig',
  'eslintrc.js',
  'flowconfig',
  'gitattributes',
  'gitignore',
  'prettierrc.js',
  'watchmanconfig',
  'editorconfig',
];

function processDotfiles(filePath: string) {
  const dotfile = UNDERSCORED_DOTFILES.find((e) => filePath.includes(`_${e}`));

  if (dotfile === undefined) {
    return;
  }

  renameFile(filePath, `_${dotfile}`, `.${dotfile}`);
}

export function changePlaceholderInTemplate({
  projectName,
  placeholderName,
  placeholderTitle = DEFAULT_TITLE_PLACEHOLDER,
  projectTitle = projectName,
}: PlaceholderConfig) {
  logger.debug(`Changing ${placeholderName} for ${projectName} in template`);

  walk(process.cwd())
    .reverse()
    .forEach((filePath: string) => {
      if (shouldIgnoreFile(filePath)) {
        return;
      }
      if (!fs.statSync(filePath).isDirectory()) {
        replaceNameInUTF8File(filePath, projectName, placeholderName);
        replaceNameInUTF8File(filePath, projectTitle, placeholderTitle);
      }
      if (shouldRenameFile(filePath, placeholderName)) {
        renameFile(filePath, placeholderName, projectName);
      }
      if (shouldRenameFile(filePath, placeholderName.toLowerCase())) {
        renameFile(
          filePath,
          placeholderName.toLowerCase(),
          projectName.toLowerCase(),
        );
      }

      processDotfiles(filePath);
    });
}
