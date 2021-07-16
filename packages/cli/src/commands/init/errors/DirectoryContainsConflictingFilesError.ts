export default class DirectoryContainsConflictingFilesError extends Error {
  constructor(directory: string, conflicts: string[]) {
    let errorString = `The directory ${directory} contains files that could conflict:\n`;

    for (const file of conflicts) {
      errorString += `  ${file}\n`;
    }
    errorString +=
      '\nEither try using a new directory name, or remove the files listed above.';

    super(errorString);
  }
}
