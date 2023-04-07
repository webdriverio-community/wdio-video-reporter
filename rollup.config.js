import { readFileSync } from 'fs';
import { extname } from 'path';
import { createFilter } from 'rollup-pluginutils';
import resolve from 'rollup-plugin-node-resolve';
import del from 'rollup-plugin-delete';

/**
 * Transform imports of pngs to base64
 */
const png = (options = {}) => {
  const filter = createFilter(options.include, options.exclude);
  return {
    name: 'png',
    load(id) {
      if (filter(id) && extname(id) === '.png') {
        return `export default '${readFileSync(id, 'base64')}'`;
      }
    },
  };
};

module.exports = {
  input: 'src/index.js',
  output: [
    {
      name: 'VideoRecorder',
      file: 'dist/wdio-video-reporter.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      name: 'VideoRecorder',
      file: 'dist/wdio-video-reporter.mjs',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    del({targets: 'dist/*'}),
    png(),
    resolve({
      modulesOnly: true,
      preferBuiltins: true,
    }),
  ],
  external: [
    'mkdirp',
    'fs-extra',
    '@ffmpeg-installer/ffmpeg',
    '@wdio/reporter',
    '@wdio/allure-reporter',
    'system-sleep',
    'path',
    'child_process',
    'glob',
    'util',
  ],
};

