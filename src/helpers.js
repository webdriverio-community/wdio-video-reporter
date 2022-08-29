import allureReporter from '@wdio/allure-reporter';
import { path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';

import config from './config.js';

let writeLog;
export default {
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

    //send event to nice-html-reporter
    process.emit('test:video-capture', videoPath);

    if (config.usingAllure) {
      allureReporter.addAttachment('Execution video', videoPath, 'video/mp4');
    }

    const command = `"${ffmpegPath}"`;
    const args = [
      '-y',
      '-r', '10',
      '-i', `"${this.recordingPath}/%04d.png"`,
      '-vcodec', 'libx264',
      '-crf', '32',
      '-pix_fmt', 'yuv420p',
      '-vf', `"scale=${config.videoScale}","setpts=${config.videoSlowdownMultiplier}.0*PTS"`,
      `"${videoPath}"`,
    ];

    if (config.debugMode) {
      writeLog(`ffmpeg command: ${command + ' ' + args}\n`);
    }

    const promise = Promise
      .all(this.screenshotPromises || [])
      .then(() => new Promise((resolve) => {
        const cp = spawn(command, args, {
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

  getCurrentCapabilities (videoReporterObject) {
    const currentCapabilities = videoReporterObject.isMultiremote
      ? videoReporterObject.capabilities[Object.keys(videoReporterObject.capabilities)[0]]
      : videoReporterObject.capabilities;
    return currentCapabilities;
  },
};
