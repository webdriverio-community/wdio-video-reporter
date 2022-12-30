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
    if(options.outputDir) {
      config.outputDir = options.outputDir;
    } else {
      // Wdio doesn't pass outputDir, but logFile which includes outputDir
      config.outputDir = options.logFile ? path.dirname(options.logFile) : config.outputDir;
    }
    if(config.outputDir.length > 1) {
      config.outputDir = config.outputDir.replace(/[\/|\\]$/, '');
    }
    config.saveAllVideos = options.saveAllVideos || config.saveAllVideos;
    config.videoSlowdownMultiplier = options.videoSlowdownMultiplier || config.videoSlowdownMultiplier;
    config.videoScale = options.videoScale || config.videoScale;
    config.videoRenderTimeout = options.videoRenderTimeout || config.videoRenderTimeout;
    config.excludedActions.push(...(options.addExcludedActions || []));
    config.jsonWireActions.push(...(options.addJsonWireActions || []));
    config.recordAllActions = options.recordAllActions || false;
    config.maxTestNameCharacters = options.maxTestNameCharacters || config.maxTestNameCharacters;
    config.logLevel = options.logLevel || config.logLevel;
    config.screenshotIntervalSecs = options.screenshotIntervalSecs || config.screenshotIntervalSecs;
    if (config.screenshotIntervalSecs) {
      config.screenshotIntervalSecs = Math.max(config.screenshotIntervalSecs, 0.5);
    }

    this.screenshotPromises = [];
    this.videos = [];
    this.videoPromises = [];
    this.testnameStructure = [];
    this.testname = '';
    this.frameNr = 0;
    this.videos = [];
    this.config = config;
    this.isMultiremote = false;
    this.capabilities = {};
    this.sessionId;
    this.runnerInstance;
    this.intervalScreenshot = undefined;

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
  async onRunnerStart (runner) {
    this.capabilities = runner.capabilities;
    this.isMultiremote = runner.isMultiremote || false;

    const sessionId = runner.isMultiremote
      ? Object.entries(runner.capabilities).map(([, capabilities]) => capabilities.sessionId)
      : runner.sessionId;

    // May not be present in the case were a spawned worker has no tests when running a subset of the test suite.
    if (!sessionId) return;
    this.sessionId = sessionId;

    const runnerInstance = runner.isMultiremote
      ? runner.instanceOptions[sessionId[0]]
      : runner.instanceOptions[sessionId];

    if (!runnerInstance) return;
    this.runnerInstance = runnerInstance;

    const allureConfig = runnerInstance.reporters.filter(r => r === 'allure' || r[0] === 'allure').pop();

    if (allureConfig && allureConfig[1] && allureConfig[1].outputDir) {
      config.allureOutputDir = path.resolve(allureConfig[1].outputDir);
    }
    config.usingAllure = !!allureConfig;
    const logLevel = runnerInstance.logLevel;

    config.debugMode = logLevel.toLowerCase() === 'trace' || logLevel.toLowerCase() === 'debug';

    helpers.debugLog('Using reporter config:' + JSON.stringify(runnerInstance.reporters, undefined, 2) + '\n\n');
    helpers.debugLog('Using config:' + JSON.stringify(config, undefined, 2) + '\n\n\n');

    // Jasmine and Mocha ought to behave the same regarding test-structure
    this.framework = runnerInstance.framework === 'cucumber' ? cucumberFramework : defaultFramework;
    this.framework.frameworkInit.call(this, browser);

    if(config.usingAllure) {
      process.on('exit', () => this.onExit.call(this));
    }
  }

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand (jsonWireMsg) {
    const command = jsonWireMsg.endpoint && jsonWireMsg.endpoint.match(/[^\/]+$/);
    const commandName = command ? command[0] : 'undefined';

    helpers.debugLog('Incoming command: ' + jsonWireMsg.endpoint + ' => [' + commandName + ']\n');

    // Filter out non-action commands and keep only last action command
    if ((!config.recordAllActions && (config.excludedActions.includes(commandName) || !config.jsonWireActions.includes(commandName)))
        || !this.recordingPath) {
      return;
    }

    this.addFrame();
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

    if (config.screenshotIntervalSecs) {
      const instance = this;
      this.intervalScreenshot = setInterval(() => instance.addFrame(), config.screenshotIntervalSecs * 1000);
    }
  }

  /**
   * Remove empty directories
   */
  onTestSkip (test) {
    if (this.intervalScreenshot) {
      clearInterval(this.intervalScreenshot);
      this.intervalScreenshot = undefined;
    }

    this.framework.onTestSkip.call(this, test);
  }

  /**
   * Add attachment to Allue if applicable and start to generate the video (Not applicable to Cucumber)
   */
  onTestEnd (test) {
    if (this.intervalScreenshot) {
      clearInterval(this.intervalScreenshot);
      this.intervalScreenshot = undefined;
    }

    this.testnameStructure.pop();

    if(config.usingAllure) {

      const capabilities = helpers.getCurrentCapabilities(this);

      if (capabilities.deviceType) {
        allureReporter.addArgument('deviceType', capabilities.deviceType);
      }
      if (capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', capabilities.browserVersion);
      }
    }

    if (test.state === 'failed' || (test.state === 'passed' && config.saveAllVideos)) {
      this.addFrame();
      helpers.generateVideo.call(this);
    }
  }

  /**
   * Wait for all ffmpeg-processes to finish
   */
  onRunnerEnd () {
    let abortTimer;
    let started = false;
    const wrapItUp = () => {
      if (!started) {
        clearTimeout(abortTimer);
        started = true;
        helpers.debugLog(`\n--- FFMPEG is done ---\n\n`);

        if (config.logLevel !== 'silent') {
          this.write('\nGenerated:' + JSON.stringify(this.videos, undefined, 2) + '\n\n');
          this.write(`\n\nVideo reporter Done!\n`);
        }

        this.isDone = true;
      }
    };

    Promise.all(this.videoPromises)
      .then(wrapItUp)
      .catch(wrapItUp);


    abortTimer = setTimeout(() => {
      this.write(`videoRenderTimeout triggered before ffmpeg had a chance to wrap up`);
      wrapItUp();
    }, config.videoRenderTimeout*1000);
  }

  /**
   * Finalize allure report
   */
  onExit () {
    const abortTime = new Date().getTime() + config.videoRenderTimeout*1000;

    helpers.waitForVideosToExist(this.videos, abortTime);
    helpers.waitForVideosToBeWritten(this.videos, abortTime);

    if (new Date().getTime() > abortTime) {
      console.log(`videoRenderTimeout triggered, not all videos finished writing to disk before patching Allure`);
    }

    fs
      .readdirSync(config.allureOutputDir)
      .filter(line => line.includes('.mp4'))
      .map(filename => path.resolve(config.allureOutputDir, filename))
      .filter(allureFile => fs.statSync(allureFile).size < 1024)
      .filter(allureFile => this.videos.includes(fs.readFileSync(allureFile).toString())) // Dont parse other browsers videos since they may not be ready
      .forEach((filePath) => {
        const videoFilePath = fs.readFileSync(filePath).toString(); // The contents of the placeholder file is the video path
        if (fs.existsSync(videoFilePath)) {
          fs.copySync(videoFilePath, filePath);
        }
      });
  }

  addFrame () {
    const frame = this.frameNr++;
    const filePath = path.resolve(this.recordingPath, frame.toString().padStart(4, '0') + '.png');

    // Create the report directory, if it does not exists
    if (!fs.existsSync(this.recordingPath)) {
      helpers.debugLog(`Creating: ${this.recordingPath}, as it not exists...\n`);
      fs.mkdirsSync(this.recordingPath);
    }

    try {
      this.screenshotPromises.push(
        browser.saveScreenshot(filePath).then(() => {
          helpers.debugLog(`- Screenshot!! (frame: ${frame})\n`);
        })
      );
    } catch (e) {
      fs.writeFile(filePath, notAvailableImage, 'base64');
      helpers.debugLog('- Screenshot not available (frame: ${frame})...\n');
    }
  }
}


