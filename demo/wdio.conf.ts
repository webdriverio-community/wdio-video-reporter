import url from 'node:url'
import path from 'node:path'
import allure from 'allure-commandline'

import video from '../dist/wdio-video-reporter.mjs'
import { browser } from '@wdio/globals'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export const config: WebdriverIO.Config = {
  // Set up the browser window
  before: function () {
    browser.setWindowSize(1320, 768)
  },

  // ===============
  // Custom settings
  // ===============
  logLevel: 'info', // trace | debug | info | warn | error | silent
  outputDir: path.join(__dirname, '_results_'),
  reporters: [
    'spec',
    [video, {
      saveAllVideos: false,       // If true, also saves videos for successful test cases
      videoSlowdownMultiplier: 3, // Higher to get slower videos, lower for faster videos [Value 1-100]
      videoRenderTimeout: 15000,      // milliseconds to wait for a video to finish rendering
      videoFormat: 'webm'
    }],
    ['allure', {
      outputDir: path.join(__dirname, '_results_/allure-raw')
    }],
  ],

  // ============
  // Capabilities
  // ============
  maxInstances: 2,
  capabilities: [
    {
      browserName: 'chrome',
      browserVersion: 'stable',
      acceptInsecureCerts: true,
      'goog:chromeOptions': {
        args: [
          '--no-sandbox',
          '--headless=new',
          '--disable-gpu']
      },
    },
    {
      browserName: 'firefox',
      acceptInsecureCerts: true,
      'moz:firefoxOptions': {
        args: ['--headless', '--no-sandbox', '--disable-gpu']
      }
    },
  ],

  // ==================
  // Some nice defaults
  // ==================
  specs: [
    './specs/**/*.e2e.ts',
  ],
  bail: 1,
  framework: 'jasmine',
  jasmineOpts: {
    defaultTimeoutInterval: 120000,
  },

  onComplete: () => {
    const reportError = new Error('Could not generate Allure report')
    const generation = allure([
      'generate',
      path.join(__dirname, '_results_', 'allure-raw'),
      '--clean'
    ])
    return new Promise<void>((resolve, reject) => {
      const generationTimeout = setTimeout(
        () => reject(reportError),
        5000)

      generation.on('exit', function (exitCode) {
        clearTimeout(generationTimeout)

        if (exitCode !== 0) {
          return reject(reportError)
        }

        console.log(
          '\n\nAllure report successfully generated at <project_root>/tests/_results_/allure-raw 🎉\n' +
          'run `$ npx http-server ./allure-results` to visualize it.'
        )
        resolve()
      })
    })
  }
}
