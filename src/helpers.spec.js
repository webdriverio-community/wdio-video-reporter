/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import {allureMocks} from '@wdio/allure-reporter';
import {cpMocks} from 'child_process';
import {fsMocks, resetFsMocks} from 'fs-extra';

import helpers from './helpers.js';
import * as configModule from './config.js';

const originalSleep = helpers.sleep;
const originalConfig = JSON.parse(JSON.stringify(configModule.default));
let config = configModule.default;

// Built in modules are not mocked by default
jest.mock('path');
jest.mock('child_process');


describe('Helpers - ', () => {
  let logger = jest.fn();

  class Video {
    constructor () {
      this.videos = [];
      this.videoPromises = [];
      this.testnameStructure = [];
      this.testname = '';
      this.frameNr = 0;
      this.videos = [];
    }
  }

  beforeEach(() => {
    resetFsMocks();
    helpers.setLogger(logger);
    Object.keys(configModule.default).forEach((key) => {
      configModule.default[key] = originalConfig[key];
    });

    config.debugMode = false;
    config.videoRenderTimeout = 5;

    helpers.sleep = jest.fn(() => {});
  });

  describe('sleep - ', () => {
    let originalDate;

    beforeEach(() => {
      let counter = 0;

      originalDate = Date;

      global.Date = class extends Date {
        constructor() {
          super();
          return counter;
        }

        getTime() {
          return counter++;
        }

        getCounter() {
          return counter;
        }
      };

      helpers.sleep = originalSleep;
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should sleep until requested time has passed', () => {
      helpers.sleep(100);

      expect(new Date().getCounter()).toBe(100 + 1);
    });
  });

  describe('debugLog - ', () => {
    const msg = 'A log line';

    beforeEach(() => {
      logger = jest.fn();
      helpers.setLogger(logger);
    });

    it('should write log if debugMode', () => {
      config.debugMode = true;

      helpers.debugLog(msg);
      expect(logger.mock.calls.length).toBe(1);
      expect(logger).toBeCalledWith(msg);
    });

    it('should not write log if not debugMode', () => {
      helpers.debugLog(msg);
      expect(logger.mock.calls.length).toBe(0);
    });
  });



  describe('generateFilename - ', () => {
    const name = 'DESCRIBE-TEST';
    const browser = 'BROWSER';
    const date = 'DATE-TIME';

    beforeEach(() => {
      let counter = 0;
      global.Date = jest.fn(() => ({
        toLocaleString() {
          return date;
        },
        getMilliseconds() {
          return ('000' + counter++).slice(-3);
        },
      }));
    });

    it('should generate name in form: name--browser--date', () => {
      expect(helpers.generateFilename(browser, name)).toBe(`${name}--${browser}--${date}-000`);
    });

    it('should replace space with -', () => {
      const testname = name + ' space';
      expect(helpers.generateFilename(browser, testname)).toBe(`${name}-space--${browser}--${date}-000`);
    });

    it('should replace . with -', () => {
      const testname = name + '.dot';
      expect(helpers.generateFilename(browser, testname)).toBe(`${name}-dot--${browser}--${date}-000`);
    });

    it('should remove characters: /?<>\\/:*|"()[]\'<>%', () => {
      const testname = name + '-/?<>\\/:*|"()[]\'<>%comment/';
      expect(helpers.generateFilename(browser, testname)).toBe(`${name}-comment--${browser}--${date}-000`);
    });

    it('should keep filenames <= config.maxTestNameCharacters', () => {
      const sixtyFourChars = '1234567890123456789012345678901234567890123456789012345678901234';
      const testname256 = sixtyFourChars + sixtyFourChars + sixtyFourChars + sixtyFourChars;
      expect(helpers.generateFilename(browser, testname256).length).toBe(config.maxTestNameCharacters);
    });

    it('should keep filenames <= config.maxTestNameCharacters with variable maxTestNameCharacters', () => {
      const sixtyFourChars = '1234567890123456789012345678901234567890123456789012345678901234';
      const testname256 = sixtyFourChars + sixtyFourChars + sixtyFourChars + sixtyFourChars;
      config.maxTestNameCharacters = 16;
      expect(helpers.generateFilename(browser, testname256).length).toBe(config.maxTestNameCharacters);
    });

    it('should keep truncated filenames unique', () => {
      const sixtyFourChars = '1234567890123456789012345678901234567890123456789012345678901234';
      const testname256 = sixtyFourChars + sixtyFourChars + sixtyFourChars + sixtyFourChars;
      const name1 = helpers.generateFilename(browser, testname256);
      const name2 = helpers.generateFilename(browser, testname256);
      expect(name1).not.toBe(name2);
    });
  });


  describe('generateVideo - ', () => {
    let video;
    let videoPromiseResolved;
    beforeEach(() => {
      video = new Video();
      video.testname = 'TEST';
      video.recordingPath = 'FOLDER';

      videoPromiseResolved = false;
      cpMocks.spawn = jest.fn().mockReturnValue({ on(msg, cb) {
        if (msg === 'close') {
          videoPromiseResolved = true;
          cb();
        }
      }});
    });

    it('should not add video attachment placeholder to Allure, if not using Allure', () => {
      helpers.generateVideo.call(video);
      expect(allureMocks.addAttachment).not.toHaveBeenCalled();
    });

    it('should add video attachment placeholder to Allure, if using Allure', () => {
      allureMocks.addAttachment = jest.fn();
      config.usingAllure = true;
      helpers.generateVideo.call(video);
      expect(allureMocks.addAttachment).toHaveBeenCalled();
    });

    it('should type ffmpeg command to log', () => {
      config.debugMode = true;
      helpers.generateVideo.call(video);
      expect(logger.mock.calls[0][0].includes('ffmpeg command')).toBeTruthy();
    });

    it('should spawn ffmpeg to generate the video', async () => {
      await helpers.generateVideo.call(video);

      expect(cpMocks.spawn).toHaveBeenCalled();
    });

    it('should resolve when ffmpeg is done', async () => {
      await helpers.generateVideo.call(video);

      expect(videoPromiseResolved).toBeTruthy();
    });
  });


  describe('waitForVideos - ', () => {
    let videos = [
      'file1.mp4',
      'file2.mp4',
      'file3.mp4',
    ];

    let originalDate = Date;
    let currentTime = 0;

    beforeEach(() => {
      config.videoRenderTimeout = 5;

      fsMocks.existsSync = jest.fn()
        .mockImplementation(() => true);

      fsMocks.statSync = jest.fn()
        .mockImplementation(() => ({ size: 512 }));

      global.Date = class extends Date {
        constructor() {
          super();
          this.getTime = jest.fn().mockReturnValue(currentTime);
        }
      };
      currentTime = 0;
    });

    afterEach(() => {
      global.date = originalDate;
    });

    it('should wait for videos to exist', () => {
      fsMocks.existsSync = jest.fn()
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementation(() => true);
      helpers.waitForVideosToExist(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(3);
    });

    it('should wait for videos to be generated', () => {
      fsMocks.statSync = jest.fn()
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementation(() => ({ size: 512 }));
      helpers.waitForVideosToExist(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(3);
    });

    it('should wait for videos to be exist and be generated', () => {
      fsMocks.existsSync = jest.fn()
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementation(() => true);
      fsMocks.statSync = jest.fn()
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementation(() => ({ size: 512 }));
      helpers.waitForVideosToExist(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(5);
    });

    it('should bail after abortTime even if not existing', () => {
      fsMocks.existsSync = jest.fn()
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementationOnce(() => false)
        .mockImplementation(() => true);
      fsMocks.statSync = jest.fn()
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => {
          currentTime = config.videoRenderTimeout*1000 + 1;
          return { size: 48 };
        })
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementationOnce(() => ({ size: 48 }))
        .mockImplementation(() => ({ size: 512 }));
      helpers.waitForVideosToExist(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(3);
    });

    it('should wait for videos to finish being written', () => {
      fsMocks.statSync = jest.fn()
        .mockImplementationOnce(() => ({ size: 50 }))
        .mockImplementationOnce(() => ({ size: 61 }))
        .mockImplementationOnce(() => ({ size: 72 }))
        .mockImplementationOnce(() => ({ size: 51 }))
        .mockImplementationOnce(() => ({ size: 62 }))
        .mockImplementationOnce(() => ({ size: 73 }))
        .mockImplementation(() => ({ size: 512 }));
      helpers.waitForVideosToBeWritten(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(2+3); // Two during reading and three good in a row
    });

    it('should wait for videos to finish being written and bail if timeout is reached', () => {
      fsMocks.statSync = jest.fn()
        .mockImplementationOnce(() => ({ size: 50 }))
        .mockImplementationOnce(() => ({ size: 61 }))
        .mockImplementationOnce(() => ({ size: 72 }))
        .mockImplementationOnce(() => {
          currentTime = config.videoRenderTimeout*1000 + 1;
          return { size: 51 };
        })
        .mockImplementationOnce(() => ({ size: 62 }))
        .mockImplementationOnce(() => ({ size: 73 }))
        .mockImplementation(() => ({ size: 512 }));
      helpers.waitForVideosToBeWritten(videos, config.videoRenderTimeout*1000);
      expect(helpers.sleep.mock.calls.length).toBe(2);
    });
  });
});
