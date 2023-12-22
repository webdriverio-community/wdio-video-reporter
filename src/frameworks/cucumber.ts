import fs from 'node:fs'
import path from 'node:path'
import { browser } from '@wdio/globals'

import logger from '@wdio/logger'
import { type SuiteStats } from '@wdio/reporter'
import allureReporter from '@wdio/allure-reporter'

import { getCurrentCapabilities, generateFilename } from '../helpers.js'
// @ts-expect-error image import
import notAvailableImage from '../assets/not-available.png'
import { SCREENSHOT_PADDING_WITH } from '../constants.js'
import type { ReporterOptions } from '../types.js'

const log = logger('wdio-video-reporter:CucumberFrameworkReporter')

export default class CucumberFrameworkReporter {
  #options: Required<ReporterOptions>
  testNameStructure: string[] = []
  recordingPath?: string
  frameNr?: number
  testName?: string

  constructor (options: Required<ReporterOptions>) {
    this.#options = options
  }

  /**
   * Set wdio config options
   */
  onRunnerStart () {}

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand () {}

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite: SuiteStats) {
    this.testNameStructure.push(suite.title.replace(/ /g, '-').replace(/-{2,}/g, '-'));

    /**
     * only run code when it's a scenario
     */
    if (suite.type !== 'scenario') {
      return
    }

    const fullName = this.testNameStructure.slice(1)
      .reduce((cur, acc) => cur + '--' + acc, this.testNameStructure[0]);

    let browserName = 'browser';
    const capabilities = getCurrentCapabilities(browser);

    const deviceName = capabilities['appium:deviceName']
    if (capabilities.browserName) {
      browserName = capabilities.browserName.toUpperCase();
    } else if (deviceName && capabilities.platformName) {
      browserName = `${deviceName.toUpperCase()}-${capabilities.platformName.toUpperCase()}`;
    }

    const testName = this.testName = generateFilename(this.#options.maxTestNameCharacters, browserName, fullName);
    this.frameNr = 0;
    this.recordingPath = path.resolve(this.#options.outputDir, this.#options.rawPath, testName);

    if (!fs.existsSync(this.recordingPath)) {
      fs.mkdirSync(this.recordingPath)
    }
  }

  /**
   * Clear suite name from naming structure
   */
  onSuiteEnd (suite: SuiteStats) {
    if (this.#options.usingAllure) {
      const capabilities = getCurrentCapabilities(browser);
      const deviceName = capabilities['appium:deviceName']
      if (deviceName) {
        allureReporter.addArgument('deviceName', deviceName);
      }
      if (capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', capabilities.browserVersion);
      }
    }

    if (suite.type !== 'scenario' || !this.recordingPath || !this.frameNr) {
      return
    }

    const hasFailedTests = suite.tests.filter(test => test.state === 'failed').length > 0;
    const allTestsPassed = suite.tests.filter(test => test.state === 'failed').length === 0;

    if (hasFailedTests || (allTestsPassed && this.#options.saveAllVideos)) {
      const filePath = path.resolve(
        this.recordingPath,
        this.frameNr.toString().padStart(SCREENSHOT_PADDING_WITH, '0') + '.png'
      );

      browser.saveScreenshot(filePath)
        .then(() => log.debug(`- Screenshot!! (frame: ${this.frameNr})\n`))
        .catch((error) => {
          fs.writeFileSync(filePath, notAvailableImage, 'base64');
          log.debug(`- Screenshot not available (frame: ${this.frameNr}). Error: ${error}..\n`);
        });
    }
  }

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart () {}

  /**
   * Remove empty directories
   */
  onTestSkip () {}

  /**
   * Add attachment to Allure if applicable and start to generate the video
   * Not applicable to Cucumber
   */
  onTestEnd () {}

  /**
   * Finalize report if using allure and clean up
   */
  onRunnerEnd () {}
};
