/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import http from 'http';
import {launchDebugger, logger} from '@react-native-community/cli-tools';
import {exec} from 'child_process';

function launchDefaultDebugger(host: string, port: number, args = '') {
  const debuggerURL = `http://${host}:${port}/debugger-ui${args}`;
  logger.info('Launching Dev Tools...');
  launchDebugger(debuggerURL);
}

function escapePath(pathname: string) {
  // " Can escape paths with spaces in OS X, Windows, and *nix
  return `"${pathname}"`;
}

type LaunchDevToolsOptions = {
  host?: string;
  port: number;
  watchFolders: ReadonlyArray<string>;
};

function launchDevTools(
  {host, port, watchFolders}: LaunchDevToolsOptions,
  isDebuggerConnected: () => boolean,
) {
  const hostname = host ?? 'localhost';
  // Explicit config always wins
  const customDebugger = process.env.REACT_DEBUGGER;
  if (customDebugger) {
    startCustomDebugger({watchFolders, customDebugger, host: hostname, port});
  } else if (!isDebuggerConnected()) {
    // Debugger is not yet open; we need to open a session
    launchDefaultDebugger(hostname, port);
  }
}

function startCustomDebugger({
  watchFolders,
  customDebugger,
  host,
  port,
}: {
  watchFolders: ReadonlyArray<string>;
  customDebugger: string;
  host: string;
  port: number;
}) {
  const folders = watchFolders.map(escapePath).join(' ');
  const command = `${customDebugger} ${folders}`;
  logger.info('Starting custom debugger by executing:', command);
  exec(
    command,
    {
      env: {
        ...process.env,
        REACT_BUNDLER_HOST: host,
        REACT_BUNDLER_PORT: `${port}`,
      },
    },
    function (error) {
      if (error !== null) {
        logger.error(
          'Error while starting custom debugger:',
          error.stack || '',
        );
      }
    },
  );
}

export default function getDevToolsMiddleware(
  options: LaunchDevToolsOptions,
  isDebuggerConnected: () => boolean,
) {
  return function devToolsMiddleware(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
  ) {
    launchDevTools(options, isDebuggerConnected);
    res.end('OK');
  };
}
