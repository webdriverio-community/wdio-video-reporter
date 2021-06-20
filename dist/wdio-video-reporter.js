'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var WdioReporter = _interopDefault(require('@wdio/reporter'));
var allureReporter = _interopDefault(require('@wdio/allure-reporter'));
var fs = _interopDefault(require('fs-extra'));
var path = _interopDefault(require('path'));
var ffmpeg = require('@ffmpeg-installer/ffmpeg');
var child_process = require('child_process');
var mkdirp = _interopDefault(require('mkdirp'));

const defaultOutputDir = '_results_';

var config = {
  debugMode: false,

  logLevel: 'info',

  videoRenderTimeout: 5,

  outputDir: defaultOutputDir,
  allureOutputDir: 'allure-results',

  // Where to save screenshots
  rawPath: 'rawSeleniumVideoGrabs',

  // Should an allure report be updated with videos
  // There is a bug, or just bad design really, where
  // Allure is needed to make sure the videos have
  // time to be saved before the process exits
  usingAllure: false,

  // Should all videos be saved, or only from failed tests
  saveAllVideos: false,

  // Video slowdown multiplier
  videoSlowdownMultiplier: 3,

  // Max chars for test names, adjust according to current system
  maxTestNameCharacters: 250,

  //
  // JSON Wire protocol
  //

  // Which commands should be excluded from screenshots
  excludedActions: [

  ],

  // Which commands should result in a screenshot (without `/session/:sessionId/`)
  // https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol
  jsonWireActions: [
    'url',
    'forward',
    'back',
    'refresh',
    'execute',
    'size',
    'position',
    'maximize',
    'click',
    'submit',
    'value',
    'keys',
    'clear',
    'selected',
    'enabled',
    'displayed',
    'orientation',
    'alert_text',
    'accept_alert',
    'dismiss_alert',
    'moveto',
    'buttondown',
    'buttonup',
    'doubleclick',
    'down',
    'up',
    'move',
    'scroll',
    'doubleclick',
    'longclick',
    'flick',
    'location',
  ],

  // If test speed is not an issue, this option can be enabled to do a screenshot on every json wire message
  recordAllActions: false,

};

let writeLog;
var helpers = {
  sleep(ms) {
    const stop = new Date().getTime() + ms;
    while(new Date().getTime() < stop);
  },

  setLogger(obj) {
    writeLog = obj;
  },

  debugLog(msg) {
    if (config.debugMode) {
      writeLog(msg);
    }
  },

  generateFilename(browserName, fullname) {
    const date = new Date();
    const msec = ('000' + date.getMilliseconds()).slice(-3);
    const timestamp = date.toLocaleString('iso', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/[ ]/g, '--').replace(/:|\//g, '-') + `-${msec}`;

    let filename = encodeURIComponent(
      `${
        fullname.replace(/\s+/g, '-')
      }--${browserName}--${timestamp}`
    ).replace(/%../g, '')
     .replace(/\./g, '-')
     .replace(/[/\\?%*:'|"<>()]/g, '');

    if (filename.length > config.maxTestNameCharacters) {
      const truncLength = (config.maxTestNameCharacters - 2)/2;
      filename = filename.slice(0, truncLength) + '--' + filename.slice(-truncLength);
    }

    return filename;
  },

  generateVideo() {
    const videoPath = path.resolve(config.outputDir, this.testname + '.mp4');
    this.videos.push(videoPath);

    if (config.usingAllure) {
      allureReporter.addAttachment('Execution video', videoPath, 'video/mp4');
    }

    const command = `"${ffmpeg.path}"`;
    const args = [
      '-y',
      '-r', '10',
      '-i', `"${this.recordingPath}/%04d.png"`,
      '-vcodec', 'libx264',
      '-crf', '32',
      '-pix_fmt', 'yuv420p',
      '-vf', `"scale=1200:trunc(ow/a/2)*2","setpts=${config.videoSlowdownMultiplier}.0*PTS"`,
      `"${videoPath}"`,
    ];

    if (config.debugMode) {
      writeLog(`ffmpeg command: ${command + ' ' + args}\n`);
    }

    const promise = Promise
      .all(this.screenshotPromises || [])
      .then(() => new Promise((resolve) => {
        const cp = child_process.spawn(command, args, {
          stdio: 'ignore',
          shell: true,
          windowsHide: true,
        });

        cp.on('close', () => {
          resolve();
        });
      }));

    this.videoPromises.push(promise);
    return promise;
  },

  waitForVideosToExist(videos, abortTime) {
    let allExist = false;
    let allGenerated = false;

    do {
      this.sleep(100);
      allExist = videos
        .map(v => fs.existsSync(v))
        .reduce((acc, cur) => acc && cur, true);
      if (allExist) {
        allGenerated = videos
          .map(v => fs.statSync(v).size)
          .reduce((acc, cur) => acc && cur > 48, true);
      }
    } while (new Date().getTime() < abortTime && !(allExist && allGenerated));
  },

  waitForVideosToBeWritten(videos, abortTime) {
    let allSizes = [];
    let allConstant = false;

    do {
      this.sleep(100);
      let currentSizes = videos.map(filename => ({filename, size: fs.statSync(filename).size}));
      allSizes = [...allSizes, currentSizes].slice(-3);

      allConstant = allSizes.length === 3 && currentSizes
        .reduce((accOuter, curOuter) => accOuter && allSizes
            .reduce((accFilter, curFilter) => [...accFilter, curFilter.filter(v => v.filename === curOuter.filename).pop()], [])
            .map(v => v.size)
            .reduce((accInner, curInner) => accInner && curInner === curOuter.size, true), true);
    } while(new Date().getTime() < abortTime && !allConstant);
  },

};

var notAvailableImage = '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';

var defaultFramework = {
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
    if(browser.capabilities.browserName) {
      browserName = browser.capabilities.browserName.toUpperCase();
    } else if(browser.capabilities.deviceName) {
      browserName = `${browser.capabilities.deviceName.toUpperCase()}-${browser.capabilities.platformName.toUpperCase()}`;
    }

    if (browser.capabilities.deviceType) {
      browserName += `-${browser.capabilities.deviceType.replace(/ /g, '-')}`;
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

var cucumberFramework = {
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
      if(browser.capabilities.browserName) {
        browserName = browser.capabilities.browserName.toUpperCase();
      } else if(browser.capabilities.deviceName) {
        browserName = `${browser.capabilities.deviceName.toUpperCase()}-${browser.capabilities.platformName.toUpperCase()}`;
      }

      if (browser.capabilities.deviceType) {
        browserName += `-${browser.capabilities.deviceType.replace(/ /g, '-')}`;
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
      if (browser.capabilities.deviceType) {
        allureReporter.addArgument('deviceType', browser.capabilities.deviceType);
      }
      if (browser.capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', browser.capabilities.browserVersion);
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

class Video extends WdioReporter {
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
    config.videoRenderTimeout = options.videoRenderTimeout || config.videoRenderTimeout;
    config.excludedActions.push(...(options.addExcludedActions || []));
    config.jsonWireActions.push(...(options.addJsonWireActions || []));
    config.recordAllActions = options.recordAllActions || false;
    config.maxTestNameCharacters = options.maxTestNameCharacters || config.maxTestNameCharacters;

    this.screenshotPromises = [];
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

    helpers.debugLog('Using reporter config:' + JSON.stringify(browser.config.reporters, undefined, 2) + '\n\n');
    helpers.debugLog('Using config:' + JSON.stringify(config, undefined, 2) + '\n\n\n');

    // Jasmine and Mocha ought to behave the same regarding test-structure
    this.framework = browser.config.framework === 'cucumber' ? cucumberFramework : defaultFramework;
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

    const filename = this.frameNr.toString().padStart(4, '0') + '.png';
    const filePath = path.resolve(this.recordingPath, filename);

    try {
      this.screenshotPromises.push(
        browser.saveScreenshot(filePath).then(() => {
          helpers.debugLog('- Screenshot!!\n');
        })
      );
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
        this.screenshotPromises.push(
          browser.saveScreenshot(filePath).then(() => {
            helpers.debugLog('- Screenshot!!\n');
          })
        );
      } catch (e) {
        fs.writeFile(filePath, notAvailableImage, 'base64');
        helpers.debugLog('- Screenshot not available...\n');
      }

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

        this.write('\nGenerated:' + JSON.stringify(this.videos, undefined, 2) + '\n\n');

        this.write(`\n\nVideo reporter Done!\n`);
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
}

module.exports = Video;
//# sourceMappingURL=wdio-video-reporter.js.map
