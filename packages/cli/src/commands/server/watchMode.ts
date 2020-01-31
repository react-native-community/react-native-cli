import readline from 'readline';
import hookStdout from '../../tools/hookStdout';
import {logger} from '@react-native-community/cli-tools';

function printWatchModeInstructions() {
  logger.log(
    '\n\nTo reload the app press "r"\nTo open developer menu press "d"',
  );
}

function enableWatchMode(messageSocket: any) {
  readline.emitKeypressEvents(process.stdin);

  // We need to set this to true to catch key presses individually.
  // As a result we have to implement our own method for exiting
  // and other commands (e.g. ctrl+c & ctrl+z)
  if (!process.stdin.setRawMode) {
    logger.log('Watch mode is not supported in this environment');
    return;
  }

  process.stdin.setRawMode(true);

  // We have no way of knowing when the dependency graph is done loading
  // except by hooking into stdout itself. We want to print instructions
  // right after its done loading.
  hookStdout(
    (output: string) =>
      output.includes('Loading dependency graph, done.') &&
      printWatchModeInstructions(),
  );

  process.stdin.on('keypress', (_key, data) => {
    const {ctrl, name} = data;
    if (ctrl === true) {
      switch (name) {
        case 'c':
          process.exit();
          break;
        case 'z':
          process.emit('SIGTSTP');
          break;
      }
    } else if (name === 'r') {
      messageSocket.broadcast('reload', null);
      logger.info('Reloading app...');
    } else if (name === 'd') {
      messageSocket.broadcast('devMenu', null);
      logger.info('Opening developer menu...');
    }
  });
}

export default enableWatchMode;
