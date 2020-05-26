/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import { resetWriteMock } from '@wdio/reporter';
import {fsMocks, resetFsMocks} from 'fs-extra';
import * as configModule from '../config.js';
import * as helpers from '../helpers.js';
import defaultFramework from './default.js';

// Built in modules are not mocked by default
jest.mock('path');

const defaultOutputDir = '_results_';
const logFileFilename = 'wdio-0-0-Video-reporter.log';
const logFile = defaultOutputDir + '/' + logFileFilename;
const originalConfig = JSON.parse(JSON.stringify(configModule.default));

describe('wdio-video-recorder - default framework - ', () => {
  let options;

  class Video {
    constructor () {
      this.videos = [];
      this.videoPromises = [];
      this.testnameStructure = [];
      this.testname = '';
      this.frameNr = 0;
      this.videos = [];
    }
    onTestStart (test) {
      defaultFramework.onTestStart.call(this, test);
    }
    onSuiteStart (test) {
      defaultFramework.onSuiteStart.call(this, test);
    }
    onTestSkip(test) {
      defaultFramework.onTestSkip.call(this, test);
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
        framework: 'mocha',
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
  });

  describe('onTestStart - ', () => {
    it('should add test title to testnameStructure', () => {
      let video = new Video(options);
      video.testnameStructure = ['DESCRIBE'];
      video.onTestStart({title: 'TEST'});
      expect(video.testnameStructure).toEqual(['DESCRIBE', 'TEST']);
    });

    it('should reset frameNr', () => {
      let video = new Video(options);
      video.frameNr = 42;
      video.onTestStart({title: 'TEST'});
      expect(video.frameNr).toEqual(0);
    });

    it('should generate testname', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.testname = undefined;
      video.onTestStart({title: 'TEST'});
      expect(video.testname).not.toEqual(undefined);
      expect(helpers.default.generateFilename).toHaveBeenCalled();
    });

    it('should append deviceType to browsername', () => {
      helpers.default.generateFilename = jest.fn();
      let video = new Video(options);
      video.testname = undefined;
      video.onTestStart({title: 'TEST'});
      expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER', 'TEST');

      helpers.default.generateFilename = jest.fn();
      global.browser.capabilities.deviceType = 'myDevice';
      video = new Video(options);
      video.testname = undefined;
      video.onTestStart({title: 'TEST'});
      expect(helpers.default.generateFilename).toHaveBeenCalledWith('BROWSER-myDevice', 'TEST');
    });

    it('should set recordingpath', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.onTestStart({title: 'TEST'});
      expect(video.recordingPath).toEqual(defaultOutputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
    });

    it('should set recordingpath when outputDir is not configured', () => {
      helpers.default.generateFilename = jest.fn().mockImplementationOnce(() => 'TEST-NAME');

      let video = new Video(options);
      video.onTestStart({title: 'TEST'});
      expect(video.recordingPath).toEqual(configModule.default.outputDir + '/' + originalConfig.rawPath + '/' + 'TEST-NAME');
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
      video.onTestStart({title: 'TEST123'});
      expect(helpers.default.generateFilename).toHaveBeenCalledWith('DEVICE-PLATFORM', 'TEST123');
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

});
