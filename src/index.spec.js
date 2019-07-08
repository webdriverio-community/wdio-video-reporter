/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import { writeMock, resetWriteMock } from '@wdio/reporter';
import { allureMocks } from '@wdio/allure-reporter';
import { fsMocks, resetFsMocks } from 'fs-extra';
import { cpMocks } from 'child_process';

// Built in modules are not mocked by default
jest.mock('path');
jest.mock('child_process');

import * as configModule from './config.js';
import * as helpers from './helpers.js';
import Video from './index.js';

const outputDir = 'outputDir';
const logFileFilename = 'wdio-0-0-Video-reporter.log';
const logFile = outputDir + '/' + logFileFilename;
const originalConfig = JSON.parse(JSON.stringify(configModule.default));
const allureDefaultOutputDir = 'allure-results';

describe('wdio-video-recorder - ', () => {
  let options;

  beforeEach(() => {
    resetFsMocks();
    resetWriteMock();

    options = { logFile };

    Object.keys(configModule.default).forEach((key) => {
      configModule.default[key] = originalConfig[key];
    });

    global.browser = {
      saveScreenshot: jest.fn(),
      capabilities: {
        browserName: 'BROWSER',
      },
      config: {
        logLevel: 'info',
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
        addExcludedActions: [ ':unitTestingAction1234567890:' ],
        addJsonWireActions: [ ':unitTestingAction1234567890:' ],
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

    it('should remove trailing / in outputDir', () => {
      options = { logFile: 'test/' + logFileFilename };

      const video = new Video(options);
      expect(video.config.outputDir).toBe('test');
    });

    it('should not remove trailing / in outputDir if /', () => {
      options = { logFile: '\/' + logFileFilename };
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
    });

    it('should user Allure default outputDir if not set in wdio config', () => {
      const video = new Video(options);
      video.onRunnerStart(browser);
      expect(video.config.allureOutputDir).toBe(allureDefaultOutputDir);
    });

    it('should use custom allure outputDir if set in config', () => {
      global.browser.config.reporters.push(['allure', { outputDir: 'customDir'}]);

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

      browser.config.reporters = [['allure', { config: {} }]];
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
  });

  describe('onAfterCommand - ', () => {
    beforeEach(() => {
      configModule.default.excludedActions = [];
      configModule.default.jsonWireActions = originalConfig.jsonWireActions;
    });

    describe('should bail when - ', () => {
      it('no recordingPath is set', () => {
        let video = new Video(options);
        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(video.frameNr).toBe(0);
      });

      it('command is not present in included JsonWireActions', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({ endpoint: '/session/abcdef/piripiri' });
        expect(video.frameNr).toBe(0);
      });

      it('command is present in excluded JsonWireActions', () => {
        options.addExcludedActions = [originalConfig.jsonWireActions[0]];
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(video.frameNr).toBe(0);
      });

      it('regexp fails to identify command', () => {
        options.addExcludedActions = [originalConfig.jsonWireActions[0]];
        let video = new Video(options);
        video.recordingPath = 'folder';
        video.onAfterCommand({ endpoint: '/nothing-to-see-here/' });
        expect(video.frameNr).toBe(0);
      });
    });

    describe('should create video frame when -', () => {
      it('command is present in included JsonWireActions', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0001.png');

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0002.png');
      });

      it('saveScreenshot fails, by saving notAvailable.png', () => {
        browser.saveScreenshot.mockImplementationOnce(() => { throw 'error'; });
        browser.saveScreenshot.mockImplementationOnce(() => { throw 'error'; });
        browser.saveScreenshot.mockImplementationOnce(() => { throw 'error'; });
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0000.png', 'file-mock', 'base64');

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0001.png', 'file-mock', 'base64');

        video.onAfterCommand({ endpoint: '/session/abcdef/' + originalConfig.jsonWireActions[0] });
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0002.png', 'file-mock', 'base64');
      });
    });
  });

  describe('onSuiteStart - ', () => {
    it('should add suite title to testnameStructure', () => {
      let video = new Video(options);
      expect(video.testnameStructure).toEqual([]);
      video.onSuiteStart({ title: 'DESCRIBE1' });
      expect(video.testnameStructure).toEqual(['DESCRIBE1']);

      video.onSuiteStart({ title: 'DESCRIBE2' });
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
    });
  });

  describe('onSuiteEnd - ', () => {
    it('should remove suite title from testnameStructure', () => {
      let video = new Video(options);
      video.testnameStructure = ['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3'];
      video.onSuiteEnd({ title: 'DESCRIBE3' });
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
      video.onSuiteEnd({ title: 'DESCRIBE2' });
      expect(video.testnameStructure).toEqual(['DESCRIBE1']);
      video.onSuiteEnd({ title: 'DESCRIBE1' });
      expect(video.testnameStructure).toEqual([]);
    });
  });

  describe('onTestStart - ', () => {
    it('should add test title to testnameStructure', () => {
      let video = new Video(options);
      video.testnameStructure = ['DESCRIBE'];
      video.onTestStart({ title: 'TEST' });
      expect(video.testnameStructure).toEqual(['DESCRIBE', 'TEST']);
    });

    it('should reset frameNr', () => {
      let video = new Video(options);
      video.frameNr = 42;
      video.onTestStart({ title: 'TEST' });
      expect(video.frameNr).toEqual(0);
    });

    it('should generate testname', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.testname = undefined;
      video.onTestStart({ title: 'TEST' });
      expect(video.testname).not.toEqual(undefined);
      expect(helpers.default.generateFilename).toHaveBeenCalled();
    });

    it('should append deviceType to browsername', () => {
      helpers.default.generateFilename = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestStart({ title: 'TEST' });
      expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER', 'TEST');

      helpers.default.generateFilename = jest.fn();
      global.browser.capabilities.deviceType = 'myDevice';
      video = new Video(options);
      video.testname = undefined;
      video.onTestStart({ title: 'TEST' });
      expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER-myDevice', 'TEST');
    });

    it('should set recordingpath', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.onTestStart({ title: 'TEST' });
      expect(video.recordingPath).toEqual(outputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
    });

    it('should set recordingpath when outputDir is not configured', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.onTestStart({ title: 'TEST' });
      expect(video.recordingPath).toEqual(configModule.default.outputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
    });
  });

  describe('onTestSkip - ', () => {
    it('should remove folder at current recordingPath', () => {
      let video = new Video(options);
      video.recordingPath = 'PATH';
      video.onTestSkip();
      expect(fsMocks.removeSync).toHaveBeenCalledWith('PATH');
    });
  
    it('should not call removeSync if recordingPath is undefined', () => {
      let video = new Video(options);
      video.recordingPath = undefined;
      video.onTestSkip();
      expect(fsMocks.removeSync).not.toHaveBeenCalled();
    });
  });

  describe('onTestEnd - ', () => {
    beforeEach(() => {
      cpMocks.spawn = jest.fn();
      allureMocks.addAttachment = jest.fn();
      allureMocks.addArgument = jest.fn();
      options.saveAllVideos = false;
      configModule.default.saveAllVideos = false;
      configModule.default.usingAllure = false;
    });

    it('should add video attachment placeholder to Allure, if using Allure', () => {
      let video = new Video(options);
      video.onTestEnd({ title: 'TEST', state: 'failed' });
      expect(allureMocks.addAttachment).not.toHaveBeenCalled();

      allureMocks.addAttachment = jest.fn();
      options.saveAllVideos = true;
      video = new Video(options);
      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(allureMocks.addAttachment).not.toHaveBeenCalled();

      allureMocks.addAttachment = jest.fn();
      video = new Video(options);
      video.config.usingAllure = true;
      video.onTestEnd({ title: 'TEST', state: 'failed' });
      expect(allureMocks.addAttachment).toHaveBeenCalled();

      allureMocks.addAttachment = jest.fn();
      video = new Video(options);
      video.config.usingAllure = true;
      video.onTestEnd({ title: 'TEST', state: 'failed' });
      expect(allureMocks.addAttachment).toHaveBeenCalled();
    });

    it('should remove test title from testnameStructure', () => {
      let video = new Video(options);
      video.testnameStructure = ['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3', 'TEST'];
      video.onTestEnd({ title: 'TEST' });
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2', 'DESCRIBE3']);
    });

    it('should add deviceType as argument to allure', () => {
      global.browser.capabilities.deviceType = 'myDevice';

      configModule.default.usingAllure = false;
      allureMocks.addArgument = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(allureMocks.addArgument).not.toHaveBeenCalled();

      configModule.default.usingAllure = true;
      allureMocks.addArgument = jest.fn();
      video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(allureMocks.addArgument).toHaveBeenCalledWith('deviceType', 'myDevice');
    });

    it('should add browserVersion as argument to allure', () => {
      global.browser.capabilities.browserVersion = '1.2.3';

      configModule.default.usingAllure = false;
      allureMocks.addArgument = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(allureMocks.addArgument).not.toHaveBeenCalled();

      configModule.default.usingAllure = true;
      allureMocks.addArgument = jest.fn();
      video = new Video(options);
      video.testname = undefined;
      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(allureMocks.addArgument).toHaveBeenCalledWith('browserVersion', '1.2.3');
    });

    it('should not take a last screenshot if test passed', () => {
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(browser.saveScreenshot).not.toHaveBeenCalledWith('folder/0000.png');
    });

    it('should take a last screenshot if test failed', () => {
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({ title: 'TEST', state: 'failed' });
      expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
    });

    it('should take a last screenshot if test passed and config saveAllvideos', () => {
      options.saveAllVideos = true;
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({ title: 'TEST', state: 'passed' });
      expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
    });

    it('should write notAvailable.png as last screenshot if saveScreenshot fails', () => {
      browser.saveScreenshot.mockImplementationOnce(() => { throw 'error'; });
      let video = new Video(options);
      video.recordingPath = 'folder';

      video.onTestEnd({ title: 'TEST', state: 'failed' });
      expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0000.png', 'file-mock', 'base64');
    });
  });

  describe('onRunnerEnd - ', () => {
    const videos = ['outputDir/MOCK-VIDEO-1.mp4', 'outputDir/MOCK-VIDEO-2.mp4'];

    beforeEach(() => {
      resetFsMocks();
      helpers.default.waitForVideos = jest.fn().mockReturnValue(videos);
    });

    it('should not spawn ffmpeg on passed tests', () => {
      let video = new Video(options);

      video.onTestEnd({ title: 'TEST', state: 'passed' });
      video.onRunnerEnd();
      expect(cpMocks.spawn).not.toHaveBeenCalled();
    });


    it('should spawn ffmpeg when tests fail', () => {
      let video = new Video(options);

      video.onTestEnd({ title: 'TEST', state: 'failed' });
      video.onRunnerEnd();
      expect(cpMocks.spawn).toHaveBeenCalled();
    });

    it('should spawn ffmpeg when saveAllVideos is true', () => {
      options.saveAllVideos = true;
      let video = new Video(options);

      video.onTestEnd({ title: 'TEST', state: 'passed' });
      video.onRunnerEnd();
      expect(cpMocks.spawn).toHaveBeenCalled();
    });

    it('should wait for videos to render', () => {
      let video = new Video(options);
      video.videos = videos;

      video.onRunnerEnd();
      expect(helpers.default.waitForVideos).toHaveBeenCalledWith(videos);
    });

    it('should not try to update Allure report if Allure is not present', () => {
      let video = new Video(options);
      video.videos = videos;

      video.onRunnerEnd();
      expect(fsMocks.readdirSync).not.toHaveBeenCalled();
    });

    it('should update Allure report if Allure is present', () => {
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onRunnerEnd();
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(1, 'outputDir/MOCK-VIDEO-1.mp4', 'outputDir/allureDir/MOCK-ALLURE-1.mp4');
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(2, 'outputDir/MOCK-VIDEO-2.mp4', 'outputDir/allureDir/MOCK-ALLURE-2.mp4');
    });

    it('should update Allure report if Allure is present with correct browser videos', () => {
      const videos = ['outputDir/MOCK-VIDEO-1.mp4', 'outputDir/MOCK-VIDEO-2.mp4',
                      'outputDir/MOCK-VIDEO-ANOTHER-BROWSER-1.mp4', 'outputDir/MOCK-VIDEO-ANOTHER-BROWSER-2.mp4'];
      let video = new Video(options);
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onRunnerEnd();
      expect(fsMocks.copySync.mock.calls.length).toBe(2);
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(1, 'outputDir/MOCK-VIDEO-1.mp4', 'outputDir/allureDir/MOCK-ALLURE-1.mp4');
      expect(fsMocks.copySync).toHaveBeenNthCalledWith(2, 'outputDir/MOCK-VIDEO-2.mp4', 'outputDir/allureDir/MOCK-ALLURE-2.mp4');
    });

    it('should write error message if failing', () => {
      fsMocks.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Error message');
      });

      let video = new Video(options);
      video.write = jest.fn();
      video.config.allureOutputDir = 'outputDir/allureDir';
      video.config.usingAllure = true;
      video.videos = videos;

      video.onRunnerEnd();

      expect(video.write.mock.calls[2][0]).toBe('Error message');
    });
  });
});
