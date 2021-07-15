export default class ConflictingFilesError extends Error {
  constructor(directoryName: string, files: string[]) {
    let errorString = '';

    errorString += `The directory ${directoryName} contains files that could conflict:\n`;
    for (const file of files) {
      errorString += `- ${file}\n`;
    }
    errorString +=
      'Either try using a new directory name, or remove the files listed above.';

    super(errorString);
  }
}
