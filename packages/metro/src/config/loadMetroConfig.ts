/**
 * Configuration file of Metro.
 */
import path from 'path';
// @ts-ignore - no typed definition for the package
import {loadConfig} from 'metro-config';
import type {Config} from '@react-native-community/cli-types';
import {reactNativePlatformResolver} from './metroPlatformResolver';

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Core/Timers/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
  ].join('|'),
);

export type {Config};

export type ConfigLoadingContext = Pick<
  Config,
  'root' | 'reactNativePath' | 'platforms'
>;

export interface MetroConfig {
  resolver: {
    resolveRequest?: (
      context: any,
      realModuleName: string,
      platform: string,
      moduleName: string,
    ) => any;
    resolverMainFields: string[];
    platforms: string[];
  };
  serializer: {
    getModulesRunBeforeMainModule: () => string[];
    getPolyfills: () => any;
  };
  server: {
    port: number;
    enhanceMiddleware?: Function;
  };
  symbolicator: {
    customizeFrame: (frame: {file: string | null}) => {collapse: boolean};
  };
  transformer: {
    allowOptionalDependencies?: boolean;
    babelTransformerPath: string;
    assetRegistryPath: string;
    assetPlugins?: Array<string>;
    asyncRequireModulePath?: string;
  };
  watchFolders: ReadonlyArray<string>;
  reporter?: any;
}

/**
 * Default configuration
 */
export const getDefaultConfig = (ctx: ConfigLoadingContext): MetroConfig => {
  const outOfTreePlatforms = Object.keys(ctx.platforms).filter(
    (platform) => ctx.platforms[platform].npmPackageName,
  );

  return {
    resolver: {
      resolveRequest:
        outOfTreePlatforms.length === 0
          ? undefined
          : reactNativePlatformResolver(
              outOfTreePlatforms.reduce<{[platform: string]: string}>(
                (result, platform) => {
                  result[platform] = ctx.platforms[platform].npmPackageName!;
                  return result;
                },
                {},
              ),
            ),
      resolverMainFields: ['react-native', 'browser', 'main'],
      platforms: [...Object.keys(ctx.platforms), 'native'],
    },
    serializer: {
      // We can include multiple copies of InitializeCore here because metro will
      // only add ones that are already part of the bundle
      getModulesRunBeforeMainModule: () => [
        require.resolve(
          path.join(ctx.reactNativePath, 'Libraries/Core/InitializeCore'),
        ),
        ...outOfTreePlatforms.map((platform) =>
          require.resolve(
            `${ctx.platforms[platform]
              .npmPackageName!}/Libraries/Core/InitializeCore`,
          ),
        ),
      ],
      getPolyfills: () =>
        require(path.join(ctx.reactNativePath, 'rn-get-polyfills'))(),
    },
    server: {
      port: Number(process.env.RCT_METRO_PORT) || 8081,
    },
    symbolicator: {
      customizeFrame: (frame: {file: string | null}) => {
        const collapse = Boolean(
          frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file),
        );
        return {collapse};
      },
    },
    transformer: {
      allowOptionalDependencies: true,
      babelTransformerPath: require.resolve(
        'metro-react-native-babel-transformer',
      ),
      assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
      asyncRequireModulePath: require.resolve(
        'metro-runtime/src/modules/asyncRequire',
      ),
    },
    watchFolders: [],
  };
};

export interface ConfigOptionsT {
  maxWorkers?: number;
  port?: number;
  projectRoot?: string;
  resetCache?: boolean;
  watchFolders?: string[];
  sourceExts?: string[];
  reporter?: any;
  config?: string;
}

/**
 * Loads Metro Config and applies `options` on top of the resolved config.
 *
 * This allows the CLI to always overwrite the file settings.
 */
export function loadMetroConfig(
  ctx: ConfigLoadingContext,
  options?: ConfigOptionsT,
): Promise<MetroConfig> {
  const defaultConfig = getDefaultConfig(ctx);
  if (options && options.reporter) {
    defaultConfig.reporter = options.reporter;
  }
  return loadConfig({cwd: ctx.root, ...options}, defaultConfig);
}
