import WdioReporter from '@wdio/reporter';
import allureReporter from '@wdio/allure-reporter';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';

import helpers from './helpers.js';
import config from './config.js';

export default class Video extends WdioReporter {
  /**
   * Set reporter options
   */
  constructor (options) {
    super(options);

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
    this.ffmpegCommands = [];
    this.testnameStructure = [];
    this.testname = '';
    this.frameNr = 0;
    this.videos = [];
    this.config = config;

    // If multiremote is enabled there may be multiple browsers
    this.browsers = [];

    helpers.setLogger(msg => this.write(msg));
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
    
    this.browsers = helpers.getBrowsers(browser);
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

    helpers.takeScreenshot(this.browsers);
  }

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite) {
    helpers.debugLog(`\n\n\n--- New suite: ${suite.title} ---\n`);
    this.testnameStructure.push(suite.title.replace(/ /g, '-'));
  }

  /**
   * Cleare suite name from naming structure
   */
  onSuiteEnd () {
    this.testnameStructure.pop();
  }

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (test) {
    helpers.debugLog(`\n\n--- New test: ${test.title} ---\n`);
    this.testnameStructure.push(test.title.replace(/ /g, '-'));
    const fullname = this.testnameStructure.slice(1).reduce((cur,acc) => cur + '--' + acc, this.testnameStructure[0]);
  
    helpers.setBrowserAttributes(this.browsers, config, fullname);

  }

  /**
   * Remove empty directories
   */
  onTestSkip () {
    fs.removeSync(this.recordingPath);
  }

  /**
   * Add attachment to Allue if applicable and start to generate the video
   */
  onTestEnd (test) {
    this.testnameStructure.pop();

    this.browsers.forEach(b => {
        if(config.usingAllure) {
          if (b.obj.capabilities.deviceType) {
            allureReporter.addArgument('deviceType', b.obj.capabilities.deviceType);
          }
          if (b.obj.capabilities.browserVersion) {
            allureReporter.addArgument('browserVersion', b.obj.capabilities.browserVersion);
          }
        }
      });

    if (test.state === 'failed' || (test.state === 'passed' && config.saveAllVideos)) {
      this.browsers.forEach(b => {
          helpers.takeScreenshot([b]);

          const videoPath = path.resolve(config.outputDir, b.testname + '.mp4');
          this.videos.push(videoPath);

          if (config.usingAllure) {
            allureReporter.addAttachment('Execution video', videoPath, 'video/mp4');
          }

          const command = `"${ffmpegPath}" -y -r 10 -i "${b.recordingPath}/${b.name}-%04d.png" -vcodec libx264` +
            ` -crf 32 -pix_fmt yuv420p -vf "scale=1200:trunc(ow/a/2)*2","setpts=${config.videoSlowdownMultiplier}.0*PTS"` +
            ` "${path.resolve(config.outputDir, b.testname)}.mp4"`;

          helpers.debugLog(`ffmpeg command: ${command}\n`);

          this.ffmpegCommands.push(command);
        });
    }
  }

  /**
   * Finalize report if using allure and clean up
   */
  onRunnerEnd () {
    try {
      helpers.debugLog(`\n\n--- Awaiting videos ---\n`);
      this.ffmpegCommands.forEach((cmd) => spawn(cmd, { stdio: 'ignore', shell: true}));
      this.videos = helpers.waitForVideos(this.videos);
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
          const videoFilePath = fs.readFileSync(filepath).toString();// The contents of the placeholder file is the video path
          fs.copySync(videoFilePath, filepath);
        });
      }

      this.write(`\n\nDone!\n`);
    }
    catch(e) {
      this.write('Error during onRunnerEnd:');
      this.write(e.message);
      this.write(e.stack);
    }
  }
}
