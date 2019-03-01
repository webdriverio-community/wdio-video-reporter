import { readFileSync } from 'fs';
import { extname } from 'path';
import { createFilter } from 'rollup-pluginutils';
import resolve from 'rollup-plugin-node-resolve';

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
  output: {
    name: 'VideoRecorder',
    file: 'dist/wdio-video-reporter.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    png(),
    resolve({
      modulesOnly: true,
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
  ],
};

