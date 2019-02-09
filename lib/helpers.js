import sleep from 'system-sleep';
import fs from 'fs-extra';

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
    const timestamp = new Date().toLocaleString('iso', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/[ ]/g, '--').replace(':', '-');

    const filename = encodeURIComponent(
      `${
        fullname.replace(/\s+/g, '-')
      }--${browserName}--${timestamp}`
    ).replace(/%../g, '')
     .replace(/\*/g, '')
     .replace(/\./g, '-')
     .replace(/[\(|\)]/g, '');
    
    return filename;
  },

  waitForVideos(videos) {
    const existingVideos = [];
    const maxWaiting = 10 * config.videoRenderTimeout;
    writeLog(`Max waiting time: ${maxWaiting}s\n`);
    
    videos.forEach((videoFilePath) => {
      writeLog(`\n--- Video ${videoFilePath} ---\n`);
      let waitForExistTimer = 0;
      let waitForRenderTimer = 0;
      do {
        sleep(100);
        if (waitForExistTimer % 10 === 0) {
          writeLog('Waiting for video to exist: ' + waitForExistTimer/10 + 's\n');
        }
      } while (!fs.existsSync(videoFilePath) && waitForExistTimer++ < maxWaiting);
      
      if (waitForExistTimer >= maxWaiting) {
        return;
      }
      
      let fileStats = fs.statSync(videoFilePath);
      let lastSize = 0;
      let videoIsReady = false;
      do {
        fileStats = fs.statSync(videoFilePath);
        videoIsReady = fileStats.size > 48 && lastSize === fileStats.size;
        lastSize = fileStats.size > 48 ? fileStats.size : 0;

        sleep(100);
        if (waitForRenderTimer % 10 === 0) {
          writeLog('Waiting for video to be ready: ' + waitForRenderTimer/10 + 's\n');
        }
      } while ((fileStats.size === 48 || !videoIsReady) && waitForRenderTimer++ < maxWaiting);
      
      if (waitForRenderTimer < maxWaiting) {
        existingVideos.push(videoFilePath);
      }
    });

    return existingVideos;
  },

};
