import url from 'node:url'
import path from 'node:path'
import allure from 'allure-commandline'

import video from '../dist/wdio-video-reporter.mjs'
import { browser } from '@wdio/globals'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

/**
 * WebdriverIO configuration specifically for testing video generation
 * with Mocha hooks (before, beforeEach, after, afterEach)
 */
export const config: WebdriverIO.Config = {
  // ==================
  // Runner Configuration
  // ==================
  specs: [
    './specs/hooks.e2e.ts'
  ],

  exclude: [],

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
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080'
        ]
      },
    },
    {
      browserName: 'firefox',
      acceptInsecureCerts: true,
      'moz:firefoxOptions': {
        args: [
          '--headless',
          '--width=1920',
          '--height=1080'
        ]
      }
    },
  ],

  // ==================
  // Test Configuration
  // ==================
  logLevel: 'info',
  bail: 0, // Don't bail on first failure - we want to see all videos
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  injectGlobals: true,

  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
    retries: 0
  },

  // ==================
  // Reporter Configuration
  // ==================
  outputDir: path.join(__dirname, '_results_'),

  reporters: [
    'spec',
    [video, {
      saveAllVideos: true, // Save videos for all tests to verify hook capture
      videoSlowdownMultiplier: 3,
      videoRenderTimeout: 30000, // Increase timeout for complex hook scenarios
      videoFormat: 'webm',
      outputDir: path.join(__dirname, '_results_'),
      maxTestNameCharacters: 250,
      excludedActions: [],
      recordAllActions: false,
      screenshotIntervalSecs: 2
    }],
    ['allure', {
      outputDir: path.join(__dirname, '_results_/allure-raw'),
      disableWebdriverStepsReporting: false,
      disableWebdriverScreenshotsReporting: true,
      useCucumberStepReporter: false,
      addConsoleLogs: true
    }],
  ],

  // ==================
  // Hooks
  // ==================

  /**
   * Gets executed before test execution begins
   */
  before: function (capabilities, specs) {
    console.log('=== WDIO Global Before Hook ===')
    browser.setWindowSize(1920, 1080)
  },

  /**
   * Hook that gets executed before a Mocha test suite
   */
  beforeSuite: function (suite) {
    console.log(`Starting suite: ${suite.title}`)
  },

  /**
   * Hook that gets executed before a Mocha test
   */
  beforeTest: function (test, context) {
    console.log(`Starting test: ${test.title}`)
  },

  /**
   * Hook that gets executed after a Mocha test
   */
  afterTest: function(test, context, { error, result, duration, passed, retries }) {
    console.log(`Finished test: ${test.title} - ${passed ? 'PASSED' : 'FAILED'}`)
    if (error) {
      console.log(`Error: ${error.message}`)
    }
  },

  /**
   * Hook that gets executed after a Mocha test suite
   */
  afterSuite: function (suite) {
    console.log(`Finished suite: ${suite.title}`)
  },

  /**
   * Gets executed after all tests are done
   */
  after: function (result, capabilities, specs) {
    console.log('=== WDIO Global After Hook ===')
    console.log(`Tests completed: ${result === 0 ? 'SUCCESS' : 'FAILURE'}`)
  },

  /**
   * Gets executed when all workers have shut down and the process is about to exit
   */
  onComplete: function(exitCode, config, capabilities, results) {
    console.log('=== WDIO Execution Complete ===')
        console.log(`📁 Location: ${path.join(__dirname, '_results_hooks_', 'allure-report')}`)
        console.log('🎬 Videos should be attached to test cases in the report')
        console.log('\nTo view the report, run:')
        console.log(`  allure open ${path.join(__dirname, '_results_hooks_', 'allure-report')}`)
        console.log('Or:')
        console.log(`  npx http-server ${path.join(__dirname, '_results_hooks_', 'allure-report')}`)
        resolve()
  }
}
