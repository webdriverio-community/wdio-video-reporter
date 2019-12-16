import WdioReporter from '@wdio/reporter';
import allureReporter from '@wdio/allure-reporter';
import fs from 'fs-extra';
import path from 'path';

import helpers from './helpers.js';
import config from './config.js';
import notAvailableImage from './assets/not-available.png';

import defaultFramework from './frameworks/default.js';
import cucumberFramework from './frameworks/cucumber.js';

export default class Video extends WdioReporter {
  /**
   * Set reporter options
   */
  constructor (options) {
    if (options.logLevel === 'silent') {
      options.logFile = undefined;
    }
    super(options);

    this.isDone = false;

    // User options
    // Wdio doesn't pass outputDir, but logFile which includes outputDir
    config.outputDir = options.logFile ? path.dirname(options.logFile) : config.outputDir;
    if(config.outputDir.length > 1) {
      config.outputDir = config.outputDir.replace(/[\/|\\]$/, '');
    }
    config.saveAllVideos = options.saveAllVideos || config.saveAllVideos;
    config.videoSlowdownMultiplier = options.videoSlowdownMultiplier || config.videoSlowdownMultiplier;
    config.videoRenderTimeout = options.videoRenderTimeout || config.videoRenderTimeout;

    // Debug
    config.excludedActions.push(...(options.addExcludedActions || []));
    config.jsonWireActions.push(...(options.addJsonWireActions || []));

    this.videos = [];
    this.videoPromises = [];
    this.testnameStructure = [];
    this.testname = '';
    this.frameNr = 0;
    this.videos = [];
    this.config = config;

    helpers.setLogger(msg => this.write(msg));
  }


  /**
   * overwrite isSynchronised method
   */
  get isSynchronised () {
    return this.isDone;
  }

  /**
   * Set wdio config options
   */
  onRunnerStart (browser) {
    const allureConfig = browser.config.reporters.filter(r => r === 'allure' || r[0] === 'allure').pop();
    if (allureConfig && allureConfig[1] && allureConfig[1].outputDir) {
      config.allureOutputDir = path.resolve(allureConfig[1].outputDir);
    }
    config.usingAllure = !!allureConfig;
    const logLevel = browser.config.logLevel;
    config.debugMode = logLevel.toLowerCase() === 'trace' || logLevel.toLowerCase() === 'debug';
    this.write('Using reporter config:' + JSON.stringify(browser.config.reporters, undefined, 2) + '\n\n');
    this.write('Using config:' + JSON.stringify(config, undefined, 2) + '\n\n\n');

    // Jasmine and Mocha ought to behave the same regarding test-structure
    this.framework = browser.config.framework === 'cucumber' ? cucumberFramework : defaultFramework;
    this.framework.frameworkInit.call(this, browser);
  }

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand (jsonWireMsg) {
    const command = jsonWireMsg.endpoint.match(/[^\/]+$/);
    const commandName = command ? command[0] : 'undefined';

    helpers.debugLog('Incomming command: ' + jsonWireMsg.endpoint + ' => [' + commandName + ']\n');

    // Filter out non-action commands and keep only last action command
    if (config.excludedActions.includes(commandName) || !config.jsonWireActions.includes(commandName) || !this.recordingPath) {
      return;
    }

    const filename = this.frameNr.toString().padStart(4, '0') + '.png';
    const filePath = path.resolve(this.recordingPath, filename);

    try {
      browser.saveScreenshot(filePath);
      helpers.debugLog('- Screenshot!!\n');
    } catch (e) {
      fs.writeFile(filePath, notAvailableImage, 'base64');
      helpers.debugLog('- Screenshot not available...\n');
    }
    this.frameNr++;
  }

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite) {
    helpers.debugLog(`\n\n\n--- New suite: ${suite.title} ---\n`);
    this.framework.onSuiteStart.call(this, suite);
  }

  /**
   * Cleare suite name from naming structure
   */
  onSuiteEnd (suite) {
    this.testnameStructure.pop();
    this.framework.onSuiteEnd.call(this, suite);
  }

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (test) {
    this.framework.onTestStart.call(this, test);
  }

  /**
   * Remove empty directories
   */
  onTestSkip (test) {
    this.framework.onTestSkip.call(this, test);
  }

  /**
   * Add attachment to Allue if applicable and start to generate the video (Not applicable to Cucumber)
   */
  onTestEnd (test) {
    this.testnameStructure.pop();

    if(config.usingAllure) {
      if (browser.capabilities.deviceType) {
        allureReporter.addArgument('deviceType', browser.capabilities.deviceType);
      }
      if (browser.capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', browser.capabilities.browserVersion);
      }
    }

    if (test.state === 'failed' || (test.state === 'passed' && config.saveAllVideos)) {
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

  /**
   * Finalize report if using allure and clean up
   */
  onRunnerEnd () {
    helpers.debugLog(`\n\n--- Awaiting videos ---\n`);
    let started = false;

    const wrapItUp = () => {
      if (!started) {
        try {
          started = true;
          helpers.debugLog(`\n--- Videos are done ---\n\n`);

          this.write('\nGenerated:' + JSON.stringify(this.videos, undefined, 2) + '\n\n');

          if (config.usingAllure) {
            helpers.debugLog(`--- Patching allure report ---\n`);

            fs
            .readdirSync(config.allureOutputDir)
            .filter(line => line.includes('.mp4'))
            .map(filename => path.resolve(config.allureOutputDir, filename))
            .filter(allureFile => this.videos.includes(fs.readFileSync(allureFile).toString())) // Dont parse other browsers videos since they may not be ready
            .forEach((filepath) => {
              const videoFilePath = fs.readFileSync(filepath).toString(); // The contents of the placeholder file is the video path
              if (fs.existsSync(videoFilePath)) {
                fs.copySync(videoFilePath, filepath);
              }
            });
          }

          this.write(`\n\nDone!\n`);
          this.isDone = true;
        }
        catch(e) {
          this.write('Error during onRunnerEnd:');
          this.write(e.message);
          this.write(e.stack);
        }
      }
    };

    Promise.all(this.videoPromises)
      .then(wrapItUp)
      .catch(wrapItUp);

    setTimeout(() => {
      helpers.debugLog(`videoRenderTimeout triggered, not all videos finished rendering`);
      this.write(`videoRenderTimeout triggered, not all videos finished rendering`);
      wrapItUp();
    }, config.videoRenderTimeout*1000);
  }
}
