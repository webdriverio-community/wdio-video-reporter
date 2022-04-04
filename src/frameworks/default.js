import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs-extra';

import helpers from '../helpers.js';
import config from '../config.js';

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
  },

  /**
   * Cleare suite name from naming structure
   */
  onSuiteEnd () {

  },

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (test) {
    helpers.debugLog(`\n\n--- New test: ${test.title} ---\n`);
    this.testnameStructure.push(test.title.replace(/ /g, '-'));
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
    mkdirp.sync(this.recordingPath);
  },

  /**
   * Remove empty directories
   */
  onTestSkip () {
    if(this.recordingPath !== undefined) {
      fs.removeSync(this.recordingPath);
    }
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
