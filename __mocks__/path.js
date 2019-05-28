export default {
  resolve(...args) {
    return args
      .slice(1)
      .reduce((acc, cur) => acc + '/' + cur, arguments[0]).replace(/\/\//g, '/');
  },
  dirname(file) {
    return file.replace(/[^\/]+?$/, '');
  },
};
