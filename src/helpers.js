import fs from 'fs-extra';

import config from './config.js';

let writeLog;
export default {
  sleep(ms) {
    const stop = new Date().getTime();
    while(new Date().getTime() < stop + ms);
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

    if (filename.length > 250) {
      const truncLength = (250 - 2)/2;
      filename = filename.slice(0, truncLength) + '--' + filename.slice(-truncLength);
    }

    return filename;
  },

  waitForVideos(videos) {
    const existingVideos = [];
    const maxWaiting = 10 * config.videoRenderTimeout;

    writeLog(`Max waiting time: ${config.videoRenderTimeout}s\n`);

    for (let idx in videos) {
      writeLog(`\n--- Video ${videos[idx]} ---\n`);
      let waitForExistTimer = 0;
      let waitForRenderTimer = 0;

      do {
        this.sleep(100);
        if (waitForExistTimer % 10 === 0) {
          writeLog('Waiting for video to exist: ' + waitForExistTimer/10 + 's\n');
        }
      } while (!fs.existsSync(videos[idx]) && waitForExistTimer++ < maxWaiting);

      if (waitForExistTimer < maxWaiting) {
        let fileStats = fs.statSync(videos[idx]);
        let lastSize = 0;
        let videoIsReady = false;

        do {
          fileStats = fs.statSync(videos[idx]);
          videoIsReady = fileStats.size > 48 && lastSize === fileStats.size;
          lastSize = fileStats.size > 48 ? fileStats.size : 0;

          this.sleep(100);
          if (waitForRenderTimer % 10 === 0) {
            writeLog('Waiting for video to be ready: ' + waitForRenderTimer/10 + 's\n');
          }
        } while ((fileStats.size === 48 || !videoIsReady) && waitForRenderTimer++ < maxWaiting);

        if (waitForRenderTimer < maxWaiting) {
          existingVideos.push(videos[idx]);
        }
      }
    }

    return existingVideos;
  },

};
