import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

import WdioReporter, { type RunnerStats, type AfterCommandArgs, SuiteStats, TestStats } from '@wdio/reporter'
import allureReporter from '@wdio/allure-reporter'
import logger from '@wdio/logger'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { glob } from 'glob'
import type { Capabilities, Options } from '@wdio/types'

import {
  waitForVideosToExist, waitForVideosToBeWritten, getCurrentCapabilities, getVideoFormatSettings,
  getVideoPath, pad
} from './helpers.js'
import { DEFAULT_OPTIONS, SCREENSHOT_PADDING_WITH, FRAME_REGEX } from './constants.js'

// @ts-expect-error image import
import notAvailableImage from './assets/not-available.png'

import DefaultFramework from './frameworks/default.js'
import CucumberFramework from './frameworks/cucumber.js'
import type { ReporterOptions } from './types.js'

const log = logger('wdio-video-reporter')

export default class VideoReporter extends WdioReporter {
  #options: Required<ReporterOptions>
  #isDone = false

  screenshotPromises: Promise<void>[] = []
  videos: string[] = []
  videoPromises: Promise<unknown>[] = []
  testNameStructure: string[] = []
  testName = ''
  frameNr = 0
  sessionId?: string
  intervalScreenshot?: NodeJS.Timeout
  allureVideos: string[] = []
  capabilities?: Capabilities.RemoteCapability
  isMultiremote = false
  runnerInstance?: Options.Testrunner
  framework?: DefaultFramework | CucumberFramework
  recordingPath?: string

  /**
   * Set reporter options
   */
  constructor (options: ReporterOptions) {
    super(options);
    this.#options = Object.assign({}, DEFAULT_OPTIONS, options) as Required<ReporterOptions>

    if (this.#options.screenshotIntervalSecs) {
      this.#options.screenshotIntervalSecs = Math.max(this.#options.screenshotIntervalSecs, 0.5);
    }
  }


  /**
   * overwrite isSynchronised method
   */
  get isSynchronised () {
    return this.#isDone;
  }

  /**
   * Set wdio config options
   */
  async onRunnerStart (runner: RunnerStats) {
    this.capabilities = runner.capabilities
    this.isMultiremote = runner.isMultiremote

    const sessionId = runner.isMultiremote
      ? Object.entries(runner.capabilities).map(([, caps]) => caps.sessionId)[0] as string
      : runner.sessionId

    // May not be present in the case were a spawned worker has no tests when running a subset of the test suite.
    if (!sessionId) {
      return
    }
    this.sessionId = sessionId;

    const runnerInstance = runner.instanceOptions[sessionId] as Options.Testrunner
    if (!runnerInstance) {
      return
    }
    this.runnerInstance = runnerInstance;
    const allureConfig: any = runnerInstance.reporters?.find(r => r === 'allure' || (r as any)[0] === 'allure')

    if (allureConfig && allureConfig[1] && allureConfig[1].outputDir) {
      this.#options.allureOutputDir = path.resolve(allureConfig[1].outputDir)
    }
    this.#options.usingAllure = Boolean(allureConfig)
    this.#options.debugMode = (
      runnerInstance.logLevel!.toLowerCase() === 'trace' ||
      runnerInstance.logLevel!.toLowerCase() === 'debug'
    )

    log.debug(`Using reporter config: ${JSON.stringify(runnerInstance.reporters, undefined, 2)}`);
    log.debug(`Using config: ${JSON.stringify(this.#options, undefined, 2)}`)

    // Jasmine and Mocha ought to behave the same regarding test-structure
    this.framework = runnerInstance.framework === 'cucumber'
      ? new CucumberFramework(this.#options)
      : new DefaultFramework(this.#options)

    if (this.#options.usingAllure) {
      process.on('exit', () => this.onExit.call(this));
    }
  }

  onBeforeCommand () {
    if (!this.#options.usingAllure) {
      return
    }

    const formatSettings = getVideoFormatSettings(this.#options.videoFormat)
    const videoPath = getVideoPath(this.#options.outputDir, this.testName, formatSettings.fileExtension)
    if (!this.allureVideos.includes(videoPath)) {
      this.allureVideos.push(videoPath)
      log.debug(`Adding execution video attachment as ${videoPath}\n`)
      allureReporter.addAttachment('Execution video', videoPath, formatSettings.contentType)
    }
  }

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand (commandArgs: AfterCommandArgs) {
    const command = commandArgs.endpoint && commandArgs.endpoint.match(/[^\/]+$/);
    const commandName = command ? command[0] : 'undefined';

    log.debug('Incoming command: ' + commandArgs.endpoint + ' => [' + commandName + ']\n');

    // Filter out non-action commands and keep only last action command
    if (
      (
        !this.#options.recordAllActions &&
        (
          this.#options.excludedActions.includes(commandName) ||
          !this.#options.snapshotCommands.includes(commandName)
        )
      ) ||
      !this.recordingPath
    ) {
      return;
    }

    // Skips screenshot if alert is displayed
    return browser.getAlertText().then(
      () => log.debug('Skipped screenshot to avoid unexpected alert closing\n'),
      () => this.addFrame())
  }

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite: SuiteStats) {
    log.debug(`\n\n\n--- New suite: ${suite.title} ---\n`)
    this.framework?.onSuiteStart(suite)
  }

  /**
   * Cleare suite name from naming structure
   */
  onSuiteEnd (suite: SuiteStats) {
    this.testNameStructure.pop()
    this.framework?.onSuiteEnd(suite)
  }

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (test: TestStats) {
    this.framework?.onTestStart(test)

    // Create the report directory, if it does not exists
    if (this.recordingPath && !fs.existsSync(this.recordingPath)) {
      log.debug(`Creating: ${this.recordingPath}, as it not exists...\n`);
      fs.mkdirSync(this.recordingPath)
    }

    if (this.#options.screenshotIntervalSecs) {
      const instance = this;
      this.intervalScreenshot = setInterval(
        () => instance.addFrame(),
        this.#options.screenshotIntervalSecs * 1000
      )
    }
  }

  /**
   * Remove empty directories
   */
  onTestSkip () {
    if (this.intervalScreenshot) {
      clearInterval(this.intervalScreenshot);
      this.intervalScreenshot = undefined;
    }

    this.framework?.onTestSkip()
  }

  /**
   * Add attachment to Allure if applicable and start to generate the video (Not applicable to Cucumber)
   */
  onTestEnd (test: TestStats) {
    if (this.intervalScreenshot) {
      clearInterval(this.intervalScreenshot)
      this.intervalScreenshot = undefined
    }

    this.testNameStructure.pop()

    if(this.#options.usingAllure) {
      const capabilities = getCurrentCapabilities(browser)

      if (capabilities['appium:deviceName']) {
        allureReporter.addArgument('deviceName', capabilities['appium:deviceName'])
      }
      if (capabilities.browserVersion) {
        allureReporter.addArgument('browserVersion', capabilities.browserVersion)
      }
    }

    if (test.state === 'failed' || (test.state === 'passed' && this.#options.saveAllVideos)) {
      this.addFrame()
      this.#generateVideo()
    }
  }

  /**
   * Wait for all ffmpeg-processes to finish
   */
  onRunnerEnd () {
    let abortTimer: NodeJS.Timeout
    let started = false
    const wrapItUp = () => {
      if (started) {
        return
      }
      clearTimeout(abortTimer)
      started = true
      log.debug(`\n--- FFMPEG is done ---\n\n`)

      if (this.#options.logLevel !== 'silent') {
        this.write('\nGenerated:' + JSON.stringify(this.videos, undefined, 2) + '\n\n')
        this.write(`\n\nVideo reporter Done!\n`)
      }

      this.#isDone = true
    }

    Promise.all(this.videoPromises)
      .then(wrapItUp)
      .catch((error) => {
        this.write(`onRunnerEnd promise resolution caught ${error}\n`)
        wrapItUp()
      })


    abortTimer = setTimeout(() => {
      this.write(`videoRenderTimeout triggered before ffmpeg had a chance to wrap up\n`)
      wrapItUp()
    }, this.#options.videoRenderTimeout * 1000)
  }

  /**
   * Finalize allure report
   */
  onExit () {
    const abortTime = Date.now() + (this.#options.videoRenderTimeout * 1000)

    waitForVideosToExist(this.videos, abortTime)
    waitForVideosToBeWritten(this.videos, abortTime)

    if (new Date().getTime() > abortTime) {
      console.log(`videoRenderTimeout triggered, not all videos finished writing to disk before patching Allure`);
    }

    const video = getVideoFormatSettings(this.#options.videoFormat)
    fs
      .readdirSync(this.#options.allureOutputDir)
      .filter(line => line.endsWith(video.fileExtension))
      .map(filename => path.resolve(this.#options.allureOutputDir, filename))
      .filter(allureFile => fs.statSync(allureFile).size < 1024)
      // Dont parse other browsers videos since they may not be ready
      .filter(allureFile => this.videos.includes(fs.readFileSync(allureFile).toString()))
      .forEach((filePath) => {
        const videoFilePath = fs.readFileSync(filePath).toString(); // The contents of the placeholder file is the video path
        if (fs.existsSync(videoFilePath)) {
          fs.copyFileSync(videoFilePath, filePath);
        }
      })
  }

  addFrame () {
    if (!this.recordingPath) {
      return
    }

    const frame = this.frameNr++;
    const filePath = path.resolve(this.recordingPath, frame.toString().padStart(SCREENSHOT_PADDING_WITH, '0') + '.png');

    this.screenshotPromises.push(
      browser.saveScreenshot(filePath)
        .then(() => log.debug(`- Screenshot!! (frame: ${frame})\n`))
        .catch((error) => {
          fs.writeFileSync(filePath, notAvailableImage, 'base64');
          log.debug(`- Screenshot not available (frame: ${frame}). Error: ${error}..\n`);
        })
    );
  }

  #generateVideo () {
    const formatSettings = getVideoFormatSettings(this.#options.videoFormat)
    const videoPath = getVideoPath(this.#options.outputDir, this.testName, formatSettings.fileExtension)
    this.videos.push(videoPath)

    // send event to nice-html-reporter
    // @ts-expect-error
    process.emit('test:video-capture', videoPath)

    const frameCheckPromise = glob(`${this.recordingPath}/*.png`).then((frames) => {
      const insertionPromises: Promise<void>[] = []

      const insertMissing = (sourceFrame: number, targetFrame: number) => {
        const src = `${this.recordingPath}/${pad(sourceFrame)}.png`
        const dest = `${this.recordingPath}/${pad(targetFrame)}.png`
        log.debug(`copying ${pad(sourceFrame)} to missing frame ${pad(targetFrame)}...\n`)
        insertionPromises.push(fsp.copyFile(src, dest))
      }

      if (frames.length) {
        const frameNumbers = frames.map((path) => +path.replace(FRAME_REGEX, '$1'))

        if (frameNumbers.length !== frameNumbers[frameNumbers.length - 1] - frameNumbers[0] + 1) {
          // fill in any blanks
          let nextFrame: number | undefined
          let lastFrame: number | undefined
          for (let i = frameNumbers[0]; i < frameNumbers[frameNumbers.length - 1]; ++i) {
            if (lastFrame && nextFrame && !frameNumbers.includes(i)) {
              insertMissing(lastFrame, i)
            } else {
              lastFrame = i
            }
            nextFrame = i + 1
          }
        }
      }
      return Promise.all(insertionPromises)
    })

    const command = `"${ffmpegPath}"`
    const args = [
      '-y',
      '-r', '10',
      '-i', `"${this.recordingPath}/%04d.png"`,
      '-vcodec', formatSettings.vcodec,
      '-crf', '32',
      '-pix_fmt', 'yuv420p',
      '-vf', `"scale=${this.#options.videoScale}","setpts=${this.#options.videoSlowdownMultiplier}.0*PTS"`,
      `"${videoPath}"`,
    ]
    log.debug(`ffmpeg command: ${command + ' ' + args}\n`)

    const promise = Promise
      .all(this.screenshotPromises || [])
      .then(() => frameCheckPromise)
      .then(() => new Promise((resolve) => {
        const cp = spawn(command, args, {
          stdio: 'ignore',
          shell: true,
          windowsHide: true,
        })
        cp.on('close', resolve)
      }))

    this.videoPromises.push(promise)
    return promise
  }
}


