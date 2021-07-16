import path from 'path';

/**
 * Finds a path inside `node_modules`
 */
export default function resolveNodeModuleDir(
  root: string,
  packageName: string,
): string {
  return path.dirname(
    require.resolve(path.join(packageName, 'package.json'), {
      paths: [root],
    }),
  );
}
