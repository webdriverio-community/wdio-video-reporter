// Import like this:
// import video from 'wdio-video-reporter';
// But for this demo:
import video from '../dist/wdio-video-reporter.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  // Set up the browser window
  before: function (capabilities, specs) {
    browser.setWindowSize(1320, 768);
  },


  // ===============
  // Custom settings
  // ===============
  logLevel: 'info', // trace | debug | info | warn | error | silent
  outputDir: join(__dirname, '_results_'),
  reporters: [
    'spec',
    [video, {
      saveAllVideos: false,       // If true, also saves videos for successful test cases
      videoSlowdownMultiplier: 3, // Higher to get slower videos, lower for faster videos [Value 1-100]
      videoRenderTimeout: 5,      // Max seconds to wait for a video to finish rendering
      videoFormat: 'webm'
    }],
    ['allure', {
      outputDir: join(__dirname, '_results_/allure-raw'),
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: true,
    }],
  ],



  // ============
  // Capabilities
  // ============
  services: [
    'selenium-standalone',
  ],
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'chrome',
      acceptInsecureCerts : true,
    },
    {
      maxInstances: 1,
      browserName: 'firefox',
      acceptInsecureCerts : true,
    },
  ],



  // ==================
  // Some nice defaults
  // ==================
  specs: [
    './specs/**/*.e2e.js',
  ],
  deprecationWarnings: true,
  maxInstances: 10,
  coloredLogs: true,
  bail: 1,
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  framework: 'jasmine',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 120000,
  },
};
