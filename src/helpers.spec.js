/*
 * All externals have basic mocks in folder `./__mocks__`
 */

import {allureMocks} from '@wdio/allure-reporter';
import {cpMocks} from 'child_process';

import helpers from './helpers.js';
import config from './config.js';

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
    helpers.setLogger(logger);
    config.debugMode = false;
    config.videoRenderTimeout = 5;
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

    it('should keep filenames <= 250 chars', () => {
      const sixyFourChars = '1234567890123456789012345678901234567890123456789012345678901234';
      const testname256 = sixyFourChars + sixyFourChars + sixyFourChars + sixyFourChars;
      expect(helpers.generateFilename(browser, testname256).length).toBe(250);
    });

    it('should keep truncated filenames unique', () => {
      const sixyFourChars = '1234567890123456789012345678901234567890123456789012345678901234';
      const testname256 = sixyFourChars + sixyFourChars + sixyFourChars + sixyFourChars;
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

    it('should spawn ffmpeg to generate the video', () => {
      helpers.generateVideo.call(video);

      expect(cpMocks.spawn).toHaveBeenCalled();
    });

    it('should resolve when ffmpeg is done', () => {
      helpers.generateVideo.call(video);

      expect(videoPromiseResolved).toBeTruthy();
    });
  });
});
