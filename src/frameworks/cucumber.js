import allureReporter from '@wdio/allure-reporter';
import mkdirp from 'mkdirp';
import fs from 'fs-extra';
import path from 'path';

import helpers from '../helpers.js';
import config from '../config.js';
import notAvailableImage from '../assets/not-available.png';

export default {
  /**
   * Init
   */
  frameworkInit () {

  },
  /**
   * Set reporter options
   */
  constructor () {

  },

  /**
   * Set wdio config options
   */
  onRunnerStart () {

  },

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand () {

  },

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite) {
    this.testnameStructure.push(suite.title.replace(/ /g, '-').replace(/-{2,}/g, '-'));
    if (suite.type === 'scenario') {
      const fullname = this.testnameStructure.slice(1).reduce((cur, acc) => cur + '--' + acc, this.testnameStructure[0]);

      let browserName = 'browser';

      const capabilities = helpers.getCurrentCapabilities(this);

      if(capabilities.browserName) {
        browserName = capabilities.browserName.toUpperCase();
      } else if(capabilities.deviceName) {
        browserName = `${capabilities.deviceName.toUpperCase()}-${capabilities.platformName.toUpperCase()}`;
      }

      if (capabilities.deviceType) {
        browserName += `-${capabilities.deviceType.replace(/ /g, '-')}`;
      }
      this.testname = helpers.generateFilename(browserName, fullname);
      this.frameNr = 0;
      this.recordingPath = path.resolve(config.outputDir, config.rawPath, this.testname);
      if (!fs.existsSync(this.recordingPath)) {
        mkdirp.sync(this.recordingPath);
      }
    }
  },

  /**
   * Clear suite name from naming structure
   */
  onSuiteEnd (suite) {
    if (config.usingAllure) {
      const capabilities = helpers.getCurrentCapabilities(this);

      if (capabilities.deviceType) {
        allureReporter.addArgument('deviceType', capabilities.deviceType);
      }
      if (capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', capabilities.browserVersion);
      }
    }

    if (suite.type === 'scenario') {
      const hasFailedTests = suite.tests.filter(test => test.state === 'failed').length > 0;
      const allTestsPassed = suite.tests.filter(test => test.state === 'failed').length === 0;

      if (hasFailedTests || (allTestsPassed && config.saveAllVideos)) {
        const filePath = path.resolve(this.recordingPath, this.frameNr.toString().padStart(4, '0') + '.png');
        try {
          browser.saveScreenshot(filePath);
          helpers.debugLog('- Screenshot!!\n');
        } catch (e) {
          fs.writeFile(filePath, notAvailableImage, 'base64');
          helpers.debugLog('- Screenshot not available...\n');
        }

        helpers.generateVideo.call(this);
      }
    }
  },

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart () {

  },

  /**
   * Remove empty directories
   */
  onTestSkip () {

  },

  /**
   * Add attachment to Allue if applicable and start to generate the video
   * Not applicable to Cucumber
   */
  onTestEnd () {

  },

  /**
   * Finalize report if using allure and clean up
   */
  onRunnerEnd () {

  },
};
