/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import {resetWriteMock, writeMock} from '@wdio/reporter';
import {allureMocks} from '@wdio/allure-reporter';
import {fsMocks, resetFsMocks} from 'fs-extra';
import * as configModule from './config.js';
import * as helpers from './helpers.js';
import Video from './index.js';

// Built in modules are not mocked by default
jest.mock('path');

jest.mock('./frameworks/default.js', () => ({
  frameworkInit: jest.fn().mockImplementation(),
}));

jest.mock('./frameworks/cucumber.js', () => ({
  frameworkInit: jest.fn().mockImplementation(),
}));

import defaultFrameworkMock from 'frameworks/default.js';
import cucumberFrameworkMock from 'frameworks/cucumber.js';

const outputDir = 'outputDir';
const logFileFilename = 'wdio-0-0-Video-reporter.log';
const logFile = outputDir + '/' + logFileFilename;
const originalConfig = JSON.parse(JSON.stringify(configModule.default));
const allureDefaultOutputDir = 'allure-results';

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('wdio-video-recorder - ', () => {
  let options;

  beforeEach(() => {
    resetFsMocks();
    resetWriteMock();
    defaultFrameworkMock.frameworkInit.mockReset();
    cucumberFrameworkMock.frameworkInit.mockReset();

    options = { logFile };

    Object.keys(configModule.default).forEach((key) => {
      configModule.default[key] = originalConfig[key];
    });

    global.browser = {
      saveScreenshot: jest.fn(() => Promise.resolve()),
      capabilities: {
        browserName: 'BROWSER',
      },
      config: {
        logLevel: 'info',
        framework: 'jasmine',
        outputDir: 'test/allure',
        reporters: [
          'video',
        ],
      },
    };
  });

  describe('constructor - ', () => {
    it('should pass options to WdioReporter', () => {
      const video = new Video(options);
      expect(video.optionsSetInConstructor).toBe(options);
    });

    it('should respect logLevel silent', () => {
      options.logLevel = 'silent';
      expect(options.logFile).toBe(logFile);
      new Video(options);
      expect(options.logFile).toBe(undefined);
    });

    it('should keep default config', () => {
      const video = new Video({}); // To avoid triggering logFile parsing for outputDir
      expect(video.config).toEqual(originalConfig);
      expect(video.config.excludedActions).not.toContain(':unitTestingAction1234567890:');
      expect(video.config.jsonWireActions).not.toContain(':unitTestingAction1234567890:');
    });

    it('should update config with options', () => {
      const options = {
        logFile,
        saveAllVideos: 'test',
        videoSlowdownMultiplier: 'test',
        videoRenderTimeout: 'test',
        addExcludedActions: [':unitTestingAction1234567890:'],
        addJsonWireActions: [':unitTestingAction1234567890:'],
      };

      const video = new Video(options);
      expect(video.config).not.toEqual(originalConfig);
      expect(video.config.outputDir).toBe(outputDir);
      expect(video.config.saveAllVideos).toBe(options.saveAllVideos);
      expect(video.config.videoSlowdownMultiplier).toBe(options.videoSlowdownMultiplier);
      expect(video.config.videoRenderTimeout).toBe(options.videoRenderTimeout);
      expect(video.config.excludedActions).toContain(':unitTestingAction1234567890:');
      expect(video.config.jsonWireActions).toContain(':unitTestingAction1234567890:');
    });

    it('should use reporter outputDir if specified', () => {
      const reporterOutputDir = 'reporter-dir';

      const options = {
        outputDir: reporterOutputDir,
        saveAllVideos: 'test',
        videoSlowdownMultiplier: 'test',
        videoRenderTimeout: 'test',
        addExcludedActions: [':unitTestingAction1234567890:'],
        addJsonWireActions: [':unitTestingAction1234567890:'],
      };

      const video = new Video(options);
      expect(video.config).not.toEqual(originalConfig);
      expect(video.config.outputDir).toBe(reporterOutputDir);
    });

    it('should use reporter outputDir if specified, even if wdio outputDir is specified', () => {
      const reporterOutputDir = 'reporter-dir';

      const options = {
        logFile,
        outputDir: reporterOutputDir,
        saveAllVideos: 'test',
        videoSlowdownMultiplier: 'test',
        videoRenderTimeout: 'test',
        addExcludedActions: [':unitTestingAction1234567890:'],
        addJsonWireActions: [':unitTestingAction1234567890:'],
      };

      const video = new Video(options);
      expect(video.config.outputDir).toBe(reporterOutputDir);
    });

    it('should use wdio outputdir if reporter outputDir is not specified', () => {
      const options = {
        logFile,
        saveAllVideos: 'test',
        videoSlowdownMultiplier: 'test',
        videoRenderTimeout: 'test',
        addExcludedActions: [':unitTestingAction1234567890:'],
        addJsonWireActions: [':unitTestingAction1234567890:'],
      };

      const video = new Video(options);
      expect(video.config.outputDir).toBe(outputDir);
    });

    it('should use default _results_ output dir if no outputDir is specified', () => {
      const options = {
        saveAllVideos: 'test',
        videoSlowdownMultiplier: 'test',
        videoRenderTimeout: 'test',
        addExcludedActions: [':unitTestingAction1234567890:'],
        addJsonWireActions: [':unitTestingAction1234567890:'],
      };

      const video = new Video(options);
      expect(video.config.outputDir).toBe(configModule.defaultOutputDir);
    });

    it('should remove trailing / in outputDir', () => {
      options = {logFile: 'test/' + logFileFilename};

      const video = new Video(options);
      expect(video.config.outputDir).toBe('test');
    });

    it('should not remove trailing / in outputDir if /', () => {
      options = {logFile: '\/' + logFileFilename};
      const video = new Video(options);
      expect(video.config.outputDir).toBe('/');
    });

    it('should set the wdio-logger to the helpers module', () => {
      helpers.default.setLogger = jest.fn();

      const video = new Video(options);
      video.config.debugMode = true;
      video.write = jest.fn();

      expect(helpers.default.setLogger).toHaveBeenCalled();

      helpers.default.debugLog('message');
      expect(writeMock).toHaveBeenCalledWith('message');
    });
  });

  describe('onRunnerStart - ', () => {
    beforeEach(() => {
      process.on = jest.fn();
    });
    afterEach(() => {
      process.on.mockRestore();
    });

    it('should user Allure default outputDir if not set in wdio config', () => {
      const video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.allureOutputDir).toBe(allureDefaultOutputDir);
    });

    it('should use custom allure outputDir if set in config', () => {
      global.browser.config.reporters.push(['allure', {outputDir: 'customDir'}]);

      let video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.allureOutputDir).toBe('customDir');
    });

    it('should figure out if allure is being used', () => {
      let video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.usingAllure).toBeFalsy();

      browser.config.reporters = ['allure'];
      video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.usingAllure).toBeTruthy();

      browser.config.reporters = [['allure', {config: {}}]];
      video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.usingAllure).toBeTruthy();
    });

    it('should sync config.debugMode to logLevel', () => {
      let video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.debugMode).toBeFalsy();

      browser.config.logLevel = 'debug';
      video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.debugMode).toBeTruthy();
    });

    it('should import code for the correct framework - default', () => {
      jest.mock('frameworks/default.js', () => ({
        frameworkInit: jest.fn().mockImplementation(),
      }));

      let video = new Video(options);
      browser.config.framework = undefined;
      video.onRunnerStart(browser);
      expect(defaultFrameworkMock.frameworkInit).toHaveBeenCalled();

      defaultFrameworkMock.frameworkInit.mockReset();

      video = new Video(options);
      browser.config.framework = 'jasmine';
      video.onRunnerStart(browser);
      expect(defaultFrameworkMock.frameworkInit).toHaveBeenCalled();

      defaultFrameworkMock.frameworkInit.mockReset();

      video = new Video(options);
      browser.config.framework = 'mocha';
      video.onRunnerStart(browser);
      expect(defaultFrameworkMock.frameworkInit).toHaveBeenCalled();

      defaultFrameworkMock.frameworkInit.mockReset();

      video = new Video(options);
      browser.config.framework = '123456789';
      video.onRunnerStart(browser);
      expect(defaultFrameworkMock.frameworkInit).toHaveBeenCalled();
    });

    it('should import code for the correct framework - cucumber', () => {
      let video = new Video(options);
      browser.config.framework = 'cucumber';
      video.onRunnerStart(browser);
      expect(cucumberFrameworkMock.frameworkInit).toHaveBeenCalled();
    });

    it('should only register exit handler if using allure', () => {
      let video = new Video(options);
      video.onRunnerStart(browser);

      expect(process.on).not.toHaveBeenCalled();

      browser.config.reporters = [['allure', {config: {}}]];
      video = new Video(options);
      video.onRunnerStart(browser);

      expect(process.on).toHaveBeenCalled();
    });
  });

  describe('onAfterCommand - ', () => {
    beforeEach(() => {
      configModule.default.excludedActions = [];
      configModule.default.jsonWireActions = originalConfig.jsonWireActions;
    });

    describe('should bail when - ', () => {
      it('no recordingPath is set', () => {
        let video = new Video(options);
        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(video.frameNr).toBe(0);
      });

      it('command is not present in included JsonWireActions', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({endpoint: '/session/abcdef/piripiri'});
        expect(video.frameNr).toBe(0);
      });

      it('command is present in excluded JsonWireActions', () => {
        options.addExcludedActions = [originalConfig.jsonWireActions[0]];
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(video.frameNr).toBe(0);
      });

      it('regexp fails to identify command', () => {
        options.addExcludedActions = [originalConfig.jsonWireActions[0]];
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({endpoint: '/nothing-to-see-here/'});
        expect(video.frameNr).toBe(0);
      });
    });

    describe('should create video frame when -', () => {
      it('command is present in included JsonWireActions', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0001.png');

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0002.png');
      });

      it('saveScreenshot fails, by saving notAvailable.png', () => {
        browser.saveScreenshot.mockImplementationOnce(() => {
          throw 'error';
        });
        browser.saveScreenshot.mockImplementationOnce(() => {
          throw 'error';
        });
        browser.saveScreenshot.mockImplementationOnce(() => {
          throw 'error';
        });
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0000.png', 'file-mock', 'base64');

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0001.png', 'file-mock', 'base64');

        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0002.png', 'file-mock', 'base64');
      });

      it('should log', (done) => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        helpers.default.debugLog = jest.fn();
        video.onAfterCommand({endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0]});
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
        expect(helpers.default.debugLog).toHaveBeenCalledWith('Incoming command: /session/abcdef/url => [url]\n');
        setImmediate(() => {
          expect(helpers.default.debugLog).toHaveBeenCalledWith('- Screenshot!!\n');
          done();
        });
      });

      it('if the recordAllActions option is set', () => {
        options.recordAllActions = true;

        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({endpoint: '/session/abcdef/piripiri'});
        expect(video.frameNr).toBe(1);
      });
    });

    describe('specific bugs -  ', () => {
      it('should handle when json-wire message is not present', () => {
        options.recordAllActions = true;

        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({endpoint: null});
        expect(video.frameNr).toBe(1);
      });
    });
  });

  describe('onSuiteStart - ', () => {
    it('should call frameworks onSuiteStart', () => {
      let video = new Video(options);
      video.framework = {
        onSuiteStart: jest.fn(),
      };
      video.onSuiteStart({title: 'TEST'});
      expect(video.framework.onSuiteStart).toHaveBeenCalled();
    });
  });

  describe('onSuiteEnd - ', () => {
    it('should remove suite title from testnameStructure', () => {
      global.browser.config.framework = 'mocha';
      let video = new Video(options);
      video.framework = {
        onSuiteEnd: jest.fn(),
      };
      video.testnameStructure = ['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3'];
      video.onSuiteEnd({title: 'DESCRIBE3'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
      video.onSuiteEnd({title: 'DESCRIBE2'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1']);
      video.onSuiteEnd({title: 'DESCRIBE1'});
      expect(video.testnameStructure).toEqual([]);
    });

    it('should call frameworks onSuiteEnd', () => {
      let video = new Video(options);
      video.framework = {
        onSuiteEnd: jest.fn(),
      };
      video.onSuiteEnd({title: 'TEST'});
      expect(video.framework.onSuiteEnd).toHaveBeenCalled();
    });
  });

  describe('onTestStart - ', () => {
    it('should call frameworks onTestStart', () => {
      let video = new Video(options);
      video.framework = {
        onTestStart: jest.fn(),
      };
      video.onTestStart({title: 'TEST'});
      expect(video.framework.onTestStart).toHaveBeenCalled();
    });
  });

  describe('onTestSkip - ', () => {
    it('should call frameworks onTestSkip', () => {
      let video = new Video(options);
      video.framework = {
        onTestSkip: jest.fn(),
      };
      video.onTestSkip({title: 'TEST'});
      expect(video.framework.onTestSkip).toHaveBeenCalled();
    });
  });

  describe('onTestEnd - ', () => {
    beforeEach(() => {
      allureMocks.addAttachment = jest.fn();
      allureMocks.addArgument = jest.fn();
      options.saveAllVideos = false;
      configModule.default.saveAllVideos = false;
      configModule.default.usingAllure = false;

      helpers.default.generateVideo = jest.fn();
    });

    it('should remove test title from testnameStructure', () => {
      let video = new Video(options);
      video.testnameStructure = ['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3', 'TEST'];
      video.onTestEnd({title: 'TEST'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3']);
    });

    it('should add deviceType as argument to allure', () => {
      global.browser.capabilities.deviceType = 'myDevice';

      configModule.default.usingAllure = false;
      allureMocks.addArgument = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(allureMocks.addArgument).not.toHaveBeenCalled();

      configModule.default.usingAllure = true;
      allureMocks.addArgument = jest.fn();
      video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(allureMocks.addArgument).toHaveBeenCalledWith('deviceType', 'myDevice');
    });

    it('should add browserVersion as argument to allure', () => {
      global.browser.capabilities.browserVersion = '1.2.3';

      configModule.default.usingAllure = false;
      allureMocks.addArgument = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(allureMocks.addArgument).not.toHaveBeenCalled();

      configModule.default.usingAllure = true;
      allureMocks.addArgument = jest.fn();
      video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(allureMocks.addArgument).toHaveBeenCalledWith('browserVersion', '1.2.3');
    });

    it('should not take a last screenshot if test passed', () => {
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(browser.saveScreenshot).not.toHaveBeenCalledWith('folder/0000.png');
    });

    it('should take a last screenshot if test failed', (done) => {
      helpers.default.debugLog = jest.fn();

      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({title: 'TEST', state: 'failed'});
      expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
      setImmediate(() => {
        expect(helpers.default.debugLog).toHaveBeenCalledWith('- Screenshot!!\n');
        done();
      });
    });

    it('should take a last screenshot if test passed and config saveAllvideos', () => {
      options.saveAllVideos = true;
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
    });

    it('should write notAvailable.png as last screenshot if saveScreenshot fails', () => {
      browser.saveScreenshot.mockImplementationOnce(() => {
        throw 'error';
      });
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({title: 'TEST', state: 'failed'});
      expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0000.png', 'file-mock', 'base64');
    });

    it('should generate videos for failed tests', () => {
      let video = new Video(options);
      video.recordingPath = 'folder';
      video.onTestEnd({title: 'TEST', state: 'failed'});

      expect(helpers.default.generateVideo).toHaveBeenCalled();
    });

    it('should not generate videos for passed tests', () => {
      let video = new Video(options);
      video.recordingPath = 'folder';
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(helpers.default.generateVideo).not.toHaveBeenCalled();
    });

    it('should generate videos for passed tests when saveAllVideos is set', () => {
      options.saveAllVideos = true;
      let video = new Video(options);
      video.recordingPath = 'folder';
      video.onTestEnd({title: 'TEST', state: 'passed'});
      expect(helpers.default.generateVideo).toHaveBeenCalled();
    });
  });

  describe('onRunnerEnd - ', () => {
    const videos = ['outputDir/MOCK-VIDEO-1.mp4', 'outputDir/MOCK-VIDEO-2.mp4'];

    beforeEach(() => {
      resetFsMocks();
      jest.useFakeTimers();
    });

    it('should wait for videos to render', async () => {
      let video = new Video(options);
      video.videos = videos;
      let resolve;
      const videoDonePromise = new Promise((res) => { resolve = res; });
      video.videoPromises.push(videoDonePromise);
      video.onRunnerEnd();

      expect(video.isDone).toBeFalsy();

      resolve();
      await flushPromises();

      expect(video.isDone).toBeTruthy();
    });

    it('should abort wait after configured videoRenderTimeout seconds', async () => {
      let video = new Video(options);
      video.videos = videos;

      const videoDonePromiseThatNeverResolves = new Promise(() => { });
      video.videoPromises.push(videoDonePromiseThatNeverResolves);
      video.onRunnerEnd();

      expect(video.isDone).toBeFalsy();

      jest.advanceTimersByTime(video.config.videoRenderTimeout*1000 - 1);
      await flushPromises();

      expect(video.isDone).toBeFalsy();

      jest.advanceTimersByTime(1);
      await flushPromises();

      expect(video.isDone).toBeTruthy();
    });

    it('should not wrapup twice if promises resolve after videoRenderTimeout', async () => {
      global.clearTimeout = jest.fn();
      let video = new Video(options);
      video.videos = videos;
      video.config.usingAllure = true;

      let resolve;
      const videoDonePromise = new Promise((res) => { resolve = res; });
      video.videoPromises.push(videoDonePromise);
      video.onRunnerEnd();

      jest.advanceTimersByTime(video.config.videoRenderTimeout*1001);
      await flushPromises();

      expect(global.clearTimeout.mock.calls.length).toBe(1);

      resolve();
      await flushPromises();

      expect(global.clearTimeout.mock.calls.length).toBe(1);
    });
  });

  describe('onExit - ', () => {
    const videos = ['outputDir/MOCK-VIDEO-1.mp4', 'outputDir/MOCK-VIDEO-2.mp4'];
    let originalDate = Date;
    let currentTime = 0;

    beforeEach(() => {
      resetFsMocks();
      jest.useFakeTimers();
      helpers.default.waitForVideosToExist = jest.fn();
      helpers.default.waitForVideosToBeWritten = jest.fn();
      global.console.log = jest.fn();

      global.Date = class extends Date {
        constructor() {
          super();
          this.getTime = jest.fn().mockReturnValue(currentTime);
        }
      };
    });

    afterEach(() => {
      global.console.log.mockRestore();
      global.date = originalDate;
    });

    it('should wait for videos to done', () => {
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onExit();

      expect(helpers.default.waitForVideosToExist).toHaveBeenCalled();
      expect(helpers.default.waitForVideosToBeWritten).toHaveBeenCalled();
    });

    it('should print warning if videoRenderTimeout is triggered', () => {
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      helpers.default.waitForVideosToBeWritten = jest.fn().mockImplementation(() => {
        currentTime = configModule.default.videoRenderTimeout*1000 + 1;
      });

      video.onExit();

      expect(global.console.log.mock.calls[0][0].includes('videoRenderTimeout triggered')).toBeTruthy();
    });

    it('should update Allure report if Allure is present', () => {
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onExit();

      expect(fsMocks.copySync).toHaveBeenNthCalledWith(1, 'outputDir/MOCK-VIDEO-1.mp4', 'outputDir/allureDir/MOCK-ALLURE-1.mp4');
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(2, 'outputDir/MOCK-VIDEO-2.mp4', 'outputDir/allureDir/MOCK-ALLURE-2.mp4');
    });

    it('should not try to copy missing files to Allure', () => {
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = [videos[0]];

      fsMocks.existsSync = jest.fn().mockReturnValue(false);

      video.onExit();

      expect(fsMocks.copySync).not.toHaveBeenCalledWith('outputDir/MOCK-VIDEO-1.mp4', 'outputDir/allureDir/MOCK-ALLURE-1.mp4');
    });

    it('should update Allure report if Allure is present with correct browser videos', () => {
      const videos = ['outputDir/MOCK-VIDEO-1.mp4', 'outputDir/MOCK-VIDEO-2.mp4',
        'outputDir/MOCK-VIDEO-ANOTHER-BROWSER-1.mp4', 'outputDir/MOCK-VIDEO-ANOTHER-BROWSER-2.mp4'];
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onExit();

      expect(fsMocks.copySync.mock.calls.length).toBe(2);
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(1, 'outputDir/MOCK-VIDEO-1.mp4', 'outputDir/allureDir/MOCK-ALLURE-1.mp4');
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(2, 'outputDir/MOCK-VIDEO-2.mp4', 'outputDir/allureDir/MOCK-ALLURE-2.mp4');
    });
  });

  describe('isSynchronized - ', () => {
    it('should tell wdio to not exit before done', () => {
      let video = new Video(options);
      expect(video.isSynchronised === false);
      video.isDone = true;
      expect(video.isSynchronised === true);
    });
  });
});
