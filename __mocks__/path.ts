export default {
  resolve(...args: any[]) {
    return args
      .slice(1)
      .reduce((acc, cur) => acc + '/' + cur, arguments[0]).replace(/\/\//g, '/');
  },
  dirname(file: string) {
    return file.replace(/[^\/]+?$/, '');
  },
};
