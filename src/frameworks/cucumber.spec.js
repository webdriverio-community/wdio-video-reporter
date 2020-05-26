/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import { resetWriteMock } from '@wdio/reporter';
import { allureMocks } from '@wdio/allure-reporter';
import { fsMocks, resetFsMocks } from 'fs-extra';
import mkdirpMock from 'mkdirp';
import * as configModule from '../config.js';
import * as helpers from '../helpers.js';
import cucumber from './cucumber.js';

// Built in modules are not mocked by default
jest.mock('path');

const defaultOutputDir = '_results_';
const logFileFilename = 'wdio-0-0-Video-reporter.log';
const logFile = defaultOutputDir + '/' + logFileFilename;
const originalConfig = JSON.parse(JSON.stringify(configModule.default));

describe('wdio-video-recorder - cucumber framework - ', () => {
  let options;

  class Video {
    constructor () {
      this.videos = [];
      this.videoPromises = [];
      this.testnameStructure = [];
      this.testname = '';
      this.frameNr = 0;
      this.videos = [];
      this.config = configModule.default;
    }
    onSuiteStart (suite) {
      cucumber.onSuiteStart.call(this, suite);
    }
    onSuiteEnd (suite) {
      cucumber.onSuiteEnd.call(this, suite);
    }
  }

  beforeEach(() => {
    resetFsMocks();
    resetWriteMock();

    options = {logFile};

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
        framework: 'cucumber',
        outputDir: 'test/allure',
        reporters: [
          'video',
        ],
      },
    };
  });


  describe('onSuiteStart - ', () => {
    it('should add suite title to testnameStructure', () => {
      let video = new Video(options);
      video.framework = {
        onSuiteStart: jest.fn(),
      };
      expect(video.testnameStructure).toEqual([]);
      video.onSuiteStart({title: 'DESCRIBE1'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1']);

      video.onSuiteStart({title: 'DESCRIBE2'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
    });

    it('should add suite title to testnameStructure', () => {
      let video = new Video(options);
      video.framework = {
        onSuiteStart: jest.fn(),
      };
      expect(video.testnameStructure).toEqual([]);
      video.onSuiteStart({title: 'DESCRIBE1'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1']);

      video.onSuiteStart({title: 'DESCRIBE2'});
      expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
    });

    describe('scenario - ', () => {
      it('should add suite title to testnameStructure', () => {
        let video = new Video(options);
        expect(video.testnameStructure).toEqual([]);
        video.onSuiteStart({title: 'DESCRIBE1', type: 'scenario'});
        expect(video.testnameStructure).toEqual(['DESCRIBE1']);

        video.onSuiteStart({title: 'DESCRIBE2', type: 'scenario'});
        expect(video.testnameStructure).toEqual(['DESCRIBE1', 'DESCRIBE2']);
      });

      it('should reset frameNr', () => {
        let video = new Video(options);
        video.frameNr = 42;
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(video.frameNr).toEqual(0);
      });

      it('should generate testname', () => {
        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

        let video = new Video(options);
        video.testname = undefined;
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(video.testname).not.toEqual(undefined);
        expect(helpers.default.generateFilename).toHaveBeenCalled();
      });

      it('should append deviceType to browsername', () => {
        helpers.default.generateFilename = jest.fn();
        let video = new Video(options);
        video.testname = undefined;
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER', 'TEST');

        helpers.default.generateFilename = jest.fn();
        global.browser.capabilities.deviceType = 'myDevice';
        video = new Video(options);
        video.testname = undefined;
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER-myDevice', 'TEST');
      });

      it('should set recordingpath', () => {
        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

        let video = new Video(options);
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(video.recordingPath).toEqual(defaultOutputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
      });

      it('should set recordingpath when outputDir is not configured', () => {
        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

        let video = new Video(options);
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(video.recordingPath).toEqual(configModule.default.outputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
      });

      it('should create recordingPath', () => {
        fsMocks.existsSync = jest.fn().mockImplementation(() => false);

        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

        let video = new Video(options);
        video.onSuiteStart({title: 'TEST', type: 'scenario'});
        expect(mkdirpMock.sync).toHaveBeenCalled();
      });

      it('should handle native appium tests', () => {
        let video = new Video(options);
        video.framework = {
          onSuiteStart: jest.fn(),
        };
        global.browser.capabilities = {
          deviceName: 'DEVICE',
          platformName: 'PLATFORM',
        };

        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => '');
        video.onSuiteStart({title: 'TEST123', type: 'scenario'});
        expect(helpers.default.generateFilename).toHaveBeenCalledWith('DEVICE-PLATFORM', 'TEST123');
      });
    });

    describe('feature - ', () => {
      it('should not generate testname', () => {
        helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

        let video = new Video(options);
        video.testname = undefined;
        video.onSuiteStart({title: 'TEST', type: 'feature'});
        expect(video.testname).toEqual(undefined);
        expect(helpers.default.generateFilename).not.toHaveBeenCalled();
      });
    });
  });

  describe('onSuiteEnd - ', () => {
    beforeEach(() => {
      allureMocks.addAttachment = jest.fn();
      allureMocks.addArgument = jest.fn();
      helpers.default.generateVideo = jest.fn();

      options.saveAllVideos = false;
      configModule.default.saveAllVideos = false;
      configModule.default.usingAllure = false;
    });

    describe('scenario - ', () => {
      let passedScenario = {
        type: 'scenario',
        title: 'SCENARIO 1',
        tests: [
          {
            type: 'test',
            title: 'TEST 1',
            state: 'passed   ',
          },
          {
            type: 'test',
            title: 'TEST 2',
            state: 'passed',
          },
        ],
      };
      let failedScenario = {
        type: 'scenario',
        title: 'SCENARIO 1',
        tests: [
          {
            type: 'test',
            title: 'TEST 1',
            state: 'failed',
          },
        ],
      };

      it('should add deviceType as argument to allure', () => {
        global.browser.capabilities.deviceType = 'myDevice';

        configModule.default.usingAllure = false;
        allureMocks.addArgument = jest.fn();
        let video = new Video(options);
        video.testname = undefined;
        video.onSuiteEnd(passedScenario);
        expect(allureMocks.addArgument).not.toHaveBeenCalled();

        configModule.default.usingAllure = true;
        allureMocks.addArgument = jest.fn();
        video = new Video(options);
        video.testname = undefined;
        video.onSuiteEnd(passedScenario);
        expect(allureMocks.addArgument).toHaveBeenCalledWith('deviceType', 'myDevice');
      });

      it('should add browserVersion as argument to allure', () => {
        global.browser.capabilities.browserVersion = '1.2.3';

        configModule.default.usingAllure = false;
        allureMocks.addArgument = jest.fn();
        let video = new Video(options);
        video.testname = undefined;
        video.onSuiteEnd(passedScenario);
        expect(allureMocks.addArgument).not.toHaveBeenCalled();

        configModule.default.usingAllure = true;
        allureMocks.addArgument = jest.fn();
        video = new Video(options);
        video.testname = undefined;
        video.onSuiteEnd(passedScenario);
        expect(allureMocks.addArgument).toHaveBeenCalledWith('browserVersion', '1.2.3');
      });

      it('should not take a last screenshot if test passed', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(passedScenario);
        expect(browser.saveScreenshot).not.toHaveBeenCalledWith('folder/0000.png');
      });

      it('should take a last screenshot if test failed', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(failedScenario);
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
      });

      it('should take a last screenshot if test passed and config saveAllvideos', () => {
        let video = new Video(options);
        video.config.saveAllVideos = true;
        video.recordingPath = 'folder';

        video.onSuiteEnd(passedScenario);
        expect(browser.saveScreenshot).toHaveBeenCalledWith('folder/0000.png');
      });

      it('should write notAvailable.png as last screenshot if saveScreenshot fails', () => {
        browser.saveScreenshot.mockImplementationOnce(() => {
          throw 'error';
        });
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(failedScenario);
        expect(fsMocks.writeFile).toHaveBeenCalledWith('folder/0000.png', 'file-mock', 'base64');
      });

      it('should generate videos for failed tests', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(failedScenario);

        expect(helpers.default.generateVideo).toHaveBeenCalled();
      });

      it('should not generate videos for passed tests', () => {
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(passedScenario);
        expect(helpers.default.generateVideo).not.toHaveBeenCalled();
      });

      it('should generate videos for passed tests when saveAllVideos is set', () => {
        configModule.default.saveAllVideos = true;
        let video = new Video(options);
        video.recordingPath = 'folder';

        video.onSuiteEnd(passedScenario);
        expect(helpers.default.generateVideo).toHaveBeenCalled();
      });
    });

    describe('feature - ', () => {
      it('should not add video attachment placeholder to Allure, if using Allure', () => {
        let video = new Video(options);

        allureMocks.addAttachment = jest.fn();
        options.saveAllVideos = true;
        video.onSuiteEnd({title: 'TEST', type: 'feature'});
        expect(allureMocks.addAttachment).not.toHaveBeenCalled();
      });
    });
  });
});
