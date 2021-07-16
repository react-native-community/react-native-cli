// https://gist.github.com/pguillory/729616

function hookStdout(callback: Function) {
  let old_write = process.stdout.write;

  // @ts-ignore
  process.stdout.write = ((write: any) =>
    function (str: string) {
      write.apply(process.stdout, arguments);
      callback(str);
    })(process.stdout.write);

  return () => {
    process.stdout.write = old_write;
  };
}

export default hookStdout;
