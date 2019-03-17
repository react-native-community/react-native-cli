// @flow
import {execFileSync} from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import * as PackageManager from '../../tools/PackageManager';

export type TemplateConfig = {
  placeholderName: string,
  templateDir: string,
  postInitScript?: string,
};

export function installTemplatePackage(templateName: string, npm?: boolean) {
  PackageManager.install([templateName], {preferYarn: !npm});
}

export function getTemplateConfig(templateName: string): TemplateConfig {
  return require(path.resolve('node_modules', templateName, 'template.config'));
}

export function copyTemplate(templateName: string, templateDir: string) {
  const templatePath = path.join('node_modules', templateName, templateDir);
  fs.copySync(templatePath, process.cwd());
}

export function executePostInstallScript(
  templateName: string,
  postInitScript: string,
) {
  execFileSync(
    path.join(process.cwd(), 'node_modules', templateName, postInitScript),
  );
}
