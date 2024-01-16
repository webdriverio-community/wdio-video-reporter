import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { createFilter } from '@rollup/pluginutils'
import type { RollupOptions } from 'rollup'

import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import del from 'rollup-plugin-delete'

interface PNGOptions {
  include?: string[]
  exclude?: string[]
}

/**
 * Transform imports of png's to base64
 */
const png = (options: PNGOptions = {}) => {
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'png',
    load(id: string) {
      if (filter(id) && extname(id) === '.png') {
        return `export default '${readFileSync(id, 'base64')}'`
      }
    }
  }
}

const config: RollupOptions = {
  input: 'src/index.ts',
  output: [
    {
      name: 'VideoRecorder',
      file: 'dist/wdio-video-reporter.mjs',
      inlineDynamicImports: true,
      format: 'es',
      sourcemap: true,
      exports: 'auto',
    },
  ],
  plugins: [
    // @ts-expect-error see https://github.com/rollup/plugins/issues/1329
    del({ targets: 'dist/*' }),
    // @ts-expect-error see https://github.com/rollup/plugins/issues/1329
    typescript({
      exclude: ['rollup.config.ts']
    }),
    png(),
    // @ts-expect-error see https://github.com/rollup/plugins/issues/1329
    resolve({
      modulesOnly: true,
      preferBuiltins: true,
    })
  ],
  external: [
    'mkdirp',
    'fs-extra',
    '@ffmpeg-installer/ffmpeg',
    '@wdio/reporter',
    '@wdio/logger',
    '@wdio/globals',
    '@wdio/allure-reporter',
    'system-sleep',
    'path',
    'child_process',
    'glob',
    'util',
  ]
}

export default config
