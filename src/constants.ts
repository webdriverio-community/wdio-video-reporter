import type { ReporterOptions } from './types.js'

export const DEFAULT_OUTPUT_DIR = '_results_'
export const SCREENSHOT_PADDING_WITH = 4
export const FRAME_REGEX = new RegExp(`^.*\\/(\\d\{${SCREENSHOT_PADDING_WITH}\})\\.png`)
export const SUPPORTED_VIDEO_FORMATS = {
  mp4: {
    fileExtension: 'mp4',
    contentType: 'video/mp4',
    vcodec: 'libx264',
  },
  webm: {
    fileExtension: 'webm',
    contentType: 'video/webm',
    vcodec: 'libvpx-vp9',
  },
  default: {
    fileExtension: 'mp4',
    contentType: 'video/mp4',
    vcodec: 'libx264',
  }
} as const

export const DEFAULT_OPTIONS: ReporterOptions = {
  debugMode: false,

  logLevel: 'info',

  videoRenderTimeout: 5,

  outputDir: DEFAULT_OUTPUT_DIR,
  allureOutputDir: 'allure-results',

  // Where to save screenshots
  rawPath: 'rawSeleniumVideoGrabs',

  // Should an allure report be updated with videos
  // There is a bug, or just bad design really, where
  // Allure is needed to make sure the videos have
  // time to be saved before the process exits
  usingAllure: false,

  // Should all videos be saved, or only from failed tests
  saveAllVideos: false,

  // Video slowdown multiplier
  videoSlowdownMultiplier: 3,

  // Video scale, see https://trac.ffmpeg.org/wiki/Scaling
  videoScale: '1200:trunc(ow/a/2)*2',

  // Max chars for test names, adjust according to current system
  maxTestNameCharacters: 250,

  // videoFormat to be used for generated videos. One of 'mp4', 'webm'
  videoFormat: 'webm',

  // Which commands should be excluded from screenshots
  excludedActions: [],

  // Which commands should result in a screenshot (without `/session/:sessionId/`)
  // https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol
  snapshotCommands: [
    'url',
    'forward',
    'back',
    'refresh',
    'execute',
    'size',
    'position',
    'maximize',
    'click',
    'submit',
    'value',
    'keys',
    'clear',
    'selected',
    'enabled',
    'displayed',
    'orientation',
    'alert_text',
    'accept_alert',
    'dismiss_alert',
    'moveto',
    'buttondown',
    'buttonup',
    'doubleclick',
    'down',
    'up',
    'move',
    'scroll',
    'doubleclick',
    'longclick',
    'flick',
    'location',
  ],

  // If test speed is not an issue, this option can be enabled to do a screenshot on every json wire message
  recordAllActions: false,

  // Add a screenshot at a regular interval
  screenshotIntervalSecs: undefined,
};
