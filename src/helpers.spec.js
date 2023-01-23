/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import {cpMocks} from 'child_process';
import {fsMocks, resetFsMocks} from 'fs-extra';
import {globMocks, resetGlobMocks} from 'glob';

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
    resetGlobMocks();
    helpers.setLogger(logger);
    Object.keys(configModule.default).forEach((key) => {
      configModule.default[key] = originalConfig[key];
    });

    config.debugMode = false;
    config.videoRenderTimeout = 5;

    helpers.sleep = jest.fn(() => Promise.resolve({}));
  });

  describe('sleep - ', () => {
    it('should sleep until requested time has passed', () => {
      helpers.sleep = originalSleep;
      jest.spyOn(Atomics, 'wait').mockReturnValue('timed-out');

      helpers.sleep(501);

      expect(Atomics.wait).toHaveBeenCalledTimes(1);
      expect(Atomics.wait.mock.calls[0][3]).toBe(501);
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
      fsMocks.copy = jest.fn();
    });

    it('should type ffmpeg command to log', async () => {
      config.debugMode = true;
      await helpers.generateVideo.call(video);
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

    it('should skip calling ffmpeg if the frame search promise is rejected', async () => {
      globMocks.glob = jest.fn((pattern, cb) => cb(new Error('failed to find frames')));

      await expect(helpers.generateVideo.call(video)).rejects.toThrow(Error);
      expect(videoPromiseResolved).toBeFalsy();
      expect(cpMocks.spawn).not.toHaveBeenCalled();
    });

    describe('missing frame mitigation - ', () => {
      it('should not insert frames if all are present', async () => {
        video.recordingPath = '/path/to/output';
        globMocks.glob = jest.fn((pattern, cb) => cb(null, [
          '/path/to/output/0000.png',
          '/path/to/output/0001.png',
          '/path/to/output/0002.png',
          '/path/to/output/0003.png',
          '/path/to/output/0004.png',
          '/path/to/output/0005.png',
          '/path/to/output/0006.png',
        ]));

        await helpers.generateVideo.call(video);

        expect(fsMocks.copy).not.toHaveBeenCalled();
        expect(logger.mock.calls.length).toBe(0);
      });

      it('should insert missing frames before calling ffmpeg', async () => {
        // should non-destructively copy 0003.png to replace the missing 0004.png
        video.recordingPath = '/path/to/output';
        globMocks.glob = jest.fn((pattern, cb) => cb(null, [
          '/path/to/output/0000.png',
          '/path/to/output/0001.png',
          '/path/to/output/0002.png',
          '/path/to/output/0003.png',
          '/path/to/output/0005.png',
          '/path/to/output/0006.png',
        ]));

        await helpers.generateVideo.call(video);

        expect(fsMocks.copy).toHaveBeenCalledTimes(1);
        expect(fsMocks.copy.mock.calls[0][0]).toBe('/path/to/output/0003.png');
        expect(fsMocks.copy.mock.calls[0][1]).toBe('/path/to/output/0004.png');
        expect(logger.mock.calls.length).toBe(1);
      });

      it('should compensate for multiple missing frames before calling ffmpeg', async () => {
        // should non-destructively copy 0003.png to replace the missing 0004.png
        video.recordingPath = '/path/to/output';
        globMocks.glob = jest.fn((pattern, cb) => cb(null, [
          '/path/to/output/0000.png',
          '/path/to/output/0001.png',
          '/path/to/output/0005.png',
          '/path/to/output/0006.png',
        ]));

        await helpers.generateVideo.call(video);

        expect(fsMocks.copy).toHaveBeenCalledTimes(3);
        expect(fsMocks.copy.mock.calls[0][0]).toBe('/path/to/output/0001.png');
        expect(fsMocks.copy.mock.calls[0][1]).toBe('/path/to/output/0002.png');
        expect(fsMocks.copy.mock.calls[1][0]).toBe('/path/to/output/0001.png');
        expect(fsMocks.copy.mock.calls[1][1]).toBe('/path/to/output/0003.png');
        expect(fsMocks.copy.mock.calls[2][0]).toBe('/path/to/output/0001.png');
        expect(fsMocks.copy.mock.calls[2][1]).toBe('/path/to/output/0004.png');
        expect(logger.mock.calls.length).toBe(3);
      });

      it('should disregard missing initial frames', async () => {
        // missing first frame doesn't affect ffmpeg
        video.recordingPath = '/path/to/output';
        globMocks.glob = jest.fn((pattern, cb) => cb(null, [
          '/path/to/output/0003.png',
          '/path/to/output/0004.png',
          '/path/to/output/0005.png',
        ]));

        await helpers.generateVideo.call(video);

        expect(fsMocks.copy).not.toHaveBeenCalled();
        expect(logger.mock.calls.length).toBe(0);
      });

      it('should still fill gaps even when initial frames are missing', async () => {
        // missing first frame doesn't affect ffmpeg
        video.recordingPath = '/path/to/output';
        globMocks.glob = jest.fn((pattern, cb) => cb(null, [
          '/path/to/output/0003.png',
          '/path/to/output/0004.png',
          '/path/to/output/0007.png',
        ]));

        await helpers.generateVideo.call(video);

        expect(fsMocks.copy).toHaveBeenCalledTimes(2);
        expect(fsMocks.copy.mock.calls[0][0]).toBe('/path/to/output/0004.png');
        expect(fsMocks.copy.mock.calls[0][1]).toBe('/path/to/output/0005.png');
        expect(fsMocks.copy.mock.calls[1][0]).toBe('/path/to/output/0004.png');
        expect(fsMocks.copy.mock.calls[1][1]).toBe('/path/to/output/0006.png');
        expect(logger.mock.calls.length).toBe(2);
      });
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

    it('should wait for videos to exist', async () => {
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

    it('should wait for videos to be generated', async () => {
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

    it('should wait for videos to be exist and be generated', async () => {
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

    it('should bail after abortTime even if not existing', async () => {
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

    it('should wait for videos to finish being written', async () => {
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

    it('should wait for videos to finish being written and bail if timeout is reached', async () => {
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
