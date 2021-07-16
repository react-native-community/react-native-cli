/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-ignore untyped metro
import Metro from 'metro';
// @ts-ignore untyped metro
import {Terminal} from 'metro-core';
import path from 'path';
import {
  createDevServerMiddleware,
  indexPageMiddleware,
} from '@react-native-community/cli-server-api';
import {Config} from '@react-native-community/cli-types';

import {loadMetroConfig} from '../config/loadMetroConfig';
import {releaseChecker} from '@react-native-community/cli-tools';
import enableWatchMode from './watchMode';

export type Args = {
  assetPlugins?: string[];
  cert?: string;
  customLogReporterPath?: string;
  host?: string;
  https?: boolean;
  maxWorkers?: number;
  key?: string;
  platforms?: string[];
  port?: number;
  resetCache?: boolean;
  sourceExts?: string[];
  transformer?: string;
  watchFolders?: string[];
  config?: string;
  projectRoot?: string;
  interactive: boolean;
};

export async function runServer(_argv: Array<string>, ctx: Config, args: Args) {
  let reportEvent: ((event: any) => void) | undefined;
  const terminal = new Terminal(process.stdout);
  const ReporterImpl = getReporterImpl(args.customLogReporterPath);
  const terminalReporter = new ReporterImpl(terminal);
  const reporter = {
    update(event: any) {
      terminalReporter.update(event);
      if (reportEvent) {
        reportEvent(event);
      }
    },
  };

  const metroConfig = await loadMetroConfig(ctx, {
    config: args.config,
    maxWorkers: args.maxWorkers,
    port: args.port,
    resetCache: args.resetCache,
    watchFolders: args.watchFolders,
    projectRoot: args.projectRoot,
    sourceExts: args.sourceExts,
    reporter,
  });

  if (args.assetPlugins) {
    metroConfig.transformer.assetPlugins = args.assetPlugins.map((plugin) =>
      require.resolve(plugin),
    );
  }

  const {middleware, attachToServer} = createDevServerMiddleware({
    host: args.host,
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });
  middleware.use(indexPageMiddleware);

  const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;
  metroConfig.server.enhanceMiddleware = (
    metroMiddleware: any,
    server: unknown,
  ) => {
    if (customEnhanceMiddleware) {
      metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
    }
    return middleware.use(metroMiddleware);
  };

  const serverInstance = await Metro.runServer(metroConfig, {
    host: args.host,
    secure: args.https,
    secureCert: args.cert,
    secureKey: args.key,
    hmrEnabled: true,
  });

  const {messageSocket, eventsSocket} = attachToServer(serverInstance);

  reportEvent = eventsSocket.reportEvent;

  if (args.interactive) {
    enableWatchMode(messageSocket);
  }

  // In Node 8, the default keep-alive for an HTTP connection is 5 seconds. In
  // early versions of Node 8, this was implemented in a buggy way which caused
  // some HTTP responses (like those containing large JS bundles) to be
  // terminated early.
  //
  // As a workaround, arbitrarily increase the keep-alive from 5 to 30 seconds,
  // which should be enough to send even the largest of JS bundles.
  //
  // For more info: https://github.com/nodejs/node/issues/13391
  //
  serverInstance.keepAliveTimeout = 30000;

  await releaseChecker(ctx.root);
}

export function getReporterImpl(customLogReporterPath: string | undefined) {
  if (customLogReporterPath === undefined) {
    return require('metro/src/lib/TerminalReporter');
  }
  try {
    // First we let require resolve it, so we can require packages in node_modules
    // as expected. eg: require('my-package/reporter');
    return require(customLogReporterPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
    // If that doesn't work, then we next try relative to the cwd, eg:
    // require('./reporter');
    return require(path.resolve(customLogReporterPath));
  }
}
