import readline from 'readline';
import {logger, hookStdout} from '@react-native-community/cli-tools';

function printWatchModeInstructions() {
  logger.log(
    '\n\nTo reload the app press "r"\nTo open developer menu press "d"',
  );
}

function enableWatchMode(messageSocket: any) {
  // We need to set this to true to catch key presses individually.
  // As a result we have to implement our own method for exiting
  // and other commands (e.g. ctrl+c & ctrl+z)
  if (!process.stdin.setRawMode) {
    logger.debug('Watch mode is not supported in this environment');
    return;
  }

  readline.emitKeypressEvents(process.stdin);

  process.stdin.setRawMode(true);

  // We have no way of knowing when the dependency graph is done loading
  // except by hooking into stdout itself. We want to print instructions
  // right after its done loading.
  const restore = hookStdout((output: string) => {
    if (output.includes('Fast - Scalable - Integrated')) {
      printWatchModeInstructions();
      restore();
    }
  });

  process.stdin.on('keypress', (_key, data) => {
    const {ctrl, name} = data;
    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.exit();
          break;
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP');
          break;
      }
    } else if (name === 'r') {
      messageSocket.broadcast('reload', null);
      logger.info('Reloading app...');
    } else if (name === 'd') {
      messageSocket.broadcast('devMenu', null);
      logger.info('Opening developer menu...');
    } else {
      console.log(_key);
    }
  });
}

export default enableWatchMode;
