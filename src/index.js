import WdioReporter from '@wdio/reporter';
import allureReporter from '@wdio/allure-reporter';
import mkdirp from 'mkdirp';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';

import helpers from './helpers.js';
import config from './config.js';
import notAvailableImage from './assets/not-available.png';

export default class Video extends WdioReporter {
  /**
   * Set reporter options
   */
  constructor (options) {
    super(options);

    // User options
    config.outputDir = options.outputDir || options.logFile.replace(/wdio-.*$/, '');
    if(config.outputDir.length > 1) {
      config.outputDir = config.outputDir.replace(/\/$/, '');
    }
    config.saveAllVideos = options.saveAllVideos || config.saveAllVideos;
    config.videoSlowdownMultiplier = options.videoSlowdownMultiplier || config.videoSlowdownMultiplier;
    config.videoRenderTimeout = options.videoRenderTimeout || config.videoRenderTimeout;
  
    // Debug
    config.excludedActions.push(...(options.addExcludedActions || []));
    config.jsonWireActions.push(...(options.addJsonWireActions || []));

    this.videos = [];
    this.testnameStructure = [];
    this.testname = '';
    this.frameNr = 0;
    this.videos = [];
    this.config = config;

    helpers.setLogger(msg => this.write(msg));
  }

  /**
   * Set wdio config options
   */
  onRunnerStart (browser) {
    config.allureOutputDir = browser.config.outputDir;
    config.usingAllure = browser.config.reporters
      .map(r => typeof r === 'object' ? r[0] : r)
      .filter(r => r === 'allure')
      .pop(); 
    config.debugMode = browser.config.logLevel.toLowerCase() === 'debug';
    this.write('Using reporter config:' + JSON.stringify(browser.config.reporters, undefined, 2) + '\n\n');
    this.write('Using config:' + JSON.stringify(config, undefined, 2) + '\n\n\n');
  }
  
  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand (jsonWireMsg) {
    const command = jsonWireMsg.endpoint.match(/[^\/]+$/);
    const commandName = command[0] || 'undefined';

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
    this.testname = helpers.generateFilename(browser.capabilities.browserName.toUpperCase(), fullname);
    this.frameNr = 0;
    this.recordingPath = path.resolve(config.outputDir, config.rawPath, this.testname);
    mkdirp.sync(this.recordingPath);
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
    if (test.state === 'failed' || (test.state === 'passed' && config.saveAllVideos)) {
      const videoPath = path.resolve(config.outputDir, this.testname + '.mp4');
      this.videos.push(videoPath);

      if (config.usingAllure) {
        allureReporter.addAttachment('Execution video', videoPath, 'video/mp4');
      }

      const command = ffmpegPath + ` -y -r 10 -i ${this.recordingPath}/%04d.png -vcodec libx264` +
        ` -crf 32 -pix_fmt yuv420p -vf "scale=1200:trunc(ow/a/2)*2","setpts=${config.videoSlowdownMultiplier}.0*PTS"` + 
        ` ${path.resolve(config.outputDir, this.testname)}.mp4`;
      helpers.debugLog(`ffmpeg command: ${command}\n`);

      spawn(command, {
        stdio: 'ignore',
        shell: true,
      });
    }
  }

  /**
   * Finalize report if using allure and clean up
   */
  onRunnerEnd () {
    helpers.debugLog(`\n\n--- Awaiting videos ---\n`);
    this.videos = helpers.waitForVideos(this.videos);
    helpers.debugLog(`\n--- Videos are done ---\n\n`);

    this.write('\nGenerated:' + JSON.stringify(this.videos, undefined, 2) + '\n\n');

    if (config.usingAllure) {
      helpers.debugLog(`--- Patching allure report ---\n`);

      fs
      .readdirSync(config.allureOutputDir)
      .filter(line => line.includes('.mp4'))
      .map(filename => path.resolve(config.allureOutputDir + '/' + filename))
      .filter(allureFile => this.videos.includes(fs.readFileSync(allureFile).toString())) // Dont parse other browsers videos since they may not be ready
      .forEach((filepath) => {
        const videoFilePath = fs.readFileSync(filepath).toString();// The contents of the placeholder file is the video path
        fs.copySync(videoFilePath, filepath);
      });
    }

    this.write(`\n\nDone!\n`);
  }
}
