import path from 'node:path'
import fs from 'node:fs'

import logger from '@wdio/logger'
import { type SuiteStats, type TestStats } from '@wdio/reporter'

import { getCurrentCapabilities, generateFilename } from '../helpers.js'
import type { ReporterOptions } from '../types.js'

const log = logger('wdio-video-reporter:CucumberFrameworkReporter')

export default class DefaultFramework {
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
  }

  /**
   * Clear suite name from naming structure
   */
  onSuiteEnd () {}

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (test: TestStats) {
    log.debug(`\n\n--- New test: ${test.title} ---\n`);
    this.testNameStructure.push(test.title.replace(/ /g, '-'));
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
    fs.mkdirSync(this.recordingPath);
  }

  /**
   * Remove empty directories
   */
  onTestSkip () {
    if(this.recordingPath) {
      fs.rmSync(this.recordingPath);
    }
  }

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
