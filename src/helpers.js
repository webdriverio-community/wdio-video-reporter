import allureReporter from '@wdio/allure-reporter';
import { path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import { spawn } from 'child_process';

import config from './config.js';

let writeLog;
export default {
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

    if (filename.length > 250) {
      const truncLength = (250 - 2)/2;
      filename = filename.slice(0, truncLength) + '--' + filename.slice(-truncLength);
    }

    return filename;
  },

  generateVideo() {
    const videoPath = path.resolve(config.outputDir, this.testname + '.mp4');
    this.videos.push(videoPath);

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
      '-vf', `"scale=1200:trunc(ow/a/2)*2","setpts=${config.videoSlowdownMultiplier}.0*PTS"`,
      `"${videoPath}"`,
    ];

    if (config.debugMode) {
      writeLog(`ffmpeg command: ${command + ' ' + args}\n`);
    }

    const promise = new Promise((resolve) => {
      const cp = spawn(command, args, {
        stdio: 'ignore',
        shell: true,
        windowsHide: true,
      });

      cp.on('close', () => {
        resolve();
      });
    });

    this.videoPromises.push(promise);
  },
};
