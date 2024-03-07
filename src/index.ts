import os from 'node:os'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

import WdioReporter, { type RunnerStats, type AfterCommandArgs, type SuiteStats, type TestStats } from '@wdio/reporter'
import { browser } from '@wdio/globals'
import type { Options } from '@wdio/types'

import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { glob } from 'glob'

import AllureReporterExtension from './allure.js'
import {
  waitForVideosToExist, waitForVideosToBeWritten, getCurrentCapabilities, getVideoFormatSettings,
  getVideoPath, pad, generateFilename
} from './helpers.js'
import { DEFAULT_OPTIONS, SCREENSHOT_PADDING_WITH, FRAME_REGEX } from './constants.js'
import type { ReporterOptions } from './types.js'

// @ts-expect-error image import
import notAvailableImage from './assets/not-available.png'

export default class VideoReporter extends WdioReporter {
  options: Required<ReporterOptions>
  #outputDir: string = os.tmpdir()
  #isDone = false
  #usingAllure = false
  #allureOutputDir?: string
  #allureReporter = new AllureReporterExtension()
  #record = true
  #defaultOutputDir = '_results_'

  screenshotPromises: Promise<void>[] = []
  videos: string[] = []
  videoPromises: Promise<unknown>[] = []
  frameNr = 0
  intervalScreenshot?: NodeJS.Timeout
  allureVideos: string[] = []
  recordingPath?: string
  testNameStructure: string[] = []
  testName?: string
  isCucumberFramework = false

  /**
   * Set reporter options
   */
  constructor (options: ReporterOptions) {
    super(options)
    this.options = Object.assign({}, DEFAULT_OPTIONS, options) as Required<ReporterOptions>

    if (this.options.screenshotIntervalSecs) {
      this.options.screenshotIntervalSecs = Math.max(this.options.screenshotIntervalSecs, 0.5)
    }
  }

  /**
   * overwrite `isSynchronised` method
   */
  get isSynchronised () {
    return this.#isDone
  }

  /**
   * set getter to verify values for testing purposes
   */
  get outputDir () { return this.#outputDir }

  /**
   * set getter to verify values for testing purposes
   */
  get allureOutputDir () { return this.#allureOutputDir }

  /**
   * set getter to verify values for testing purposes
   */
  get record () { return this.#record }

  /**
   * set setter to verify values for testing purposes
   */
  set record (value) { this.#record = value }

  /**
   * Set wdio config options
   */
  onRunnerStart (runner: RunnerStats) {
    if (this.options.onlyRecordLastFailure && runner.retry !== runner.config.specFileRetries) {
      this.#record = false
      return
    }

    this.#outputDir = this.options.outputDir ?? runner.config.outputDir as string
    this.#outputDir = this.#outputDir ?? this.#defaultOutputDir
    const sessionId = runner.isMultiremote
      ? Object.entries(runner.capabilities).map(([, caps]) => caps.sessionId)[0] as string
      : runner.sessionId

    // May not be present in the case were a spawned worker has no tests when running a subset of the test suite.
    if (!sessionId) {
      return
    }

    const runnerInstance = runner.instanceOptions[sessionId] as Options.Testrunner
    if (!runnerInstance) {
      return
    }

    this.isCucumberFramework = runnerInstance.framework === 'cucumber'
    const allureConfig: any = runnerInstance.reporters?.find(r => r === 'allure' || (r as any)[0] === 'allure')
    if (allureConfig && allureConfig[1] && allureConfig[1].outputDir) {
      this.#allureOutputDir = path.resolve(allureConfig[1].outputDir)
    }
    this.#usingAllure = Boolean(allureConfig)

    if (this.#usingAllure) {
      process.on('exit', () => this.onExit.call(this))
    }
  }

  onBeforeCommand () {
    if (!this.#usingAllure || !this.testName || !this.#record) {
      return
    }

    const formatSettings = getVideoFormatSettings(this.options.videoFormat)
    const videoPath = getVideoPath(this.#outputDir, this.testName, formatSettings.fileExtension)
    if (!this.allureVideos.includes(videoPath)) {
      this.allureVideos.push(videoPath)
      this.#log(`Adding execution video attachment as ${videoPath}`)
      this.#allureReporter.addAttachment('Execution video', videoPath, formatSettings.contentType)
    }
  }

  /**
   * Save screenshot or add not available image movie stills
   */
  onAfterCommand (commandArgs: AfterCommandArgs) {
    if (!this.#record) {
      return
    }

    const command = commandArgs.endpoint && commandArgs.endpoint.match(/[^/]+$/)
    const commandName = command ? command[0] : 'undefined'

    /**
     * Filter out non-action commands and keep only last action command
     */
    if (
      (
        !this.options.recordAllActions &&
        (
          this.options.excludedActions.includes(commandName) ||
          !this.options.snapshotCommands.includes(commandName)
        )
      ) ||
      !this.recordingPath
    ) {
      return false
    }

    /**
     * Skips screenshot if alert is displayed
     */
    this.#log(`Add frame for command: ${commandArgs.endpoint} => [${commandName}]`)
    return this.addFrame()
  }

  /**
   * Add suite name to naming structure
   */
  onSuiteStart (suite: SuiteStats) {
    if (!this.#record) {
      return
    }

    if (this.isCucumberFramework || this.options.filenamePrefixSource === 'suite') {
      this.testNameStructure.push(suite.title.replace(/ /g, '-').replace(/-{2,}/g, '-'))
    }

    if (suite.type === 'scenario') {
      this.#setRecordingPath()
    }
  }

  /**
   * Cleare suite name from naming structure
   */
  onSuiteEnd (suite: SuiteStats) {
    if (!this.#record) {
      return
    }

    this.#extendAllureReport()

    if (!this.testName) {
      return
    }

    this.testNameStructure.pop()
    const hasFailedTests = suite.tests.filter(test => test.state === 'failed').length > 0
    const allTestsPassed = suite.tests.filter(test => test.state === 'failed').length === 0

    if (hasFailedTests || (allTestsPassed && this.options.saveAllVideos)) {
      this.addFrame()
    }
  }

  /**
   * Setup filename based on test name and prepare storage directory
   */
  onTestStart (suite: TestStats) {
    if (!this.#record) {
      return
    }

    if (!this.isCucumberFramework && this.options.filenamePrefixSource === 'test') {
      this.testNameStructure.push(suite.title.replace(/ /g, '-').replace(/-{2,}/g, '-'))
    }
    this.#setRecordingPath()
    if (this.options.screenshotIntervalSecs) {
      const instance = this
      this.intervalScreenshot = setInterval(
        () => instance.addFrame(),
        this.options.screenshotIntervalSecs * 1000
      )
    }
  }

  /**
   * Remove empty directories
   */
  onTestSkip () {
    if (!this.#record) {
      return
    }

    this.clearScreenshotInterval()
  }

  /**
   * Add attachment to Allure if applicable and start to generate the video (Not applicable to Cucumber)
   */
  onTestEnd (test: TestStats) {
    if (!this.#record) {
      return
    }

    this.clearScreenshotInterval()
    if (this.options.filenamePrefixSource === 'test' || this.isCucumberFramework) {
      this.testNameStructure.pop()
    }
    this.#extendAllureReport()

    if (test.state === 'failed' || (test.state === 'passed' && this.options.saveAllVideos)) {
      this.addFrame()
      this.generateVideo()
    }
  }

  /**
   * Wait for all ffmpeg-processes to finish
   */
  onRunnerEnd () {
    if (!this.#record) {
      this.#isDone = true
      return
    }

    const abortTimer = setTimeout(() => {
      this.#log('videoRenderTimeout triggered before ffmpeg had a chance to wrap up')
      wrapItUp()
    }, this.options.videoRenderTimeout)

    const wrapItUp = () => {
      clearTimeout(abortTimer)
      if (this.#isDone) {
        return
      }
      this.#log(`Generated ${this.videos.length} videos, video report done!`)
      this.#isDone = true
    }

    Promise.all(this.videoPromises)
      .then(wrapItUp)
      .catch((error) => {
        this.#log(`onRunnerEnd promise resolution caught ${error}\n`)
        wrapItUp()
      })
  }

  /**
   * Finalize allure report
   */
  onExit () {
    const allureOutputDir = this.#allureOutputDir
    if (!allureOutputDir) {
      return
    }
    const abortTime =  this.options.videoRenderTimeout

    const startTime = new Date().getTime()

    waitForVideosToExist(this.videos, abortTime)
    waitForVideosToBeWritten(this.videos, abortTime)

    if (new Date().getTime() - startTime > abortTime) {
      console.log('videoRenderTimeout triggered, not all videos finished writing to disk before patching Allure')
    }

    const video = getVideoFormatSettings(this.options.videoFormat)
    fs
      .readdirSync(allureOutputDir)
      .filter(line => line.endsWith(video.fileExtension))
      .map(filename => path.resolve(allureOutputDir, filename))
      .filter(allureFile => fs.statSync(allureFile).size < 1024)
      // Dont parse other browsers videos since they may not be ready
      .filter(allureFile => this.videos.includes(fs.readFileSync(allureFile).toString()))
      .forEach((filePath) => {
        const videoFilePath = fs.readFileSync(filePath).toString() // The contents of the placeholder file is the video path
        if (fs.existsSync(videoFilePath)) {
          fs.copyFileSync(videoFilePath, filePath)
        }
      })
  }

  addFrame () {
    if (!this.recordingPath) {
      return false
    }

    const frame = this.frameNr++
    const filePath = path.resolve(this.recordingPath, frame.toString().padStart(SCREENSHOT_PADDING_WITH, '0') + '.png')

    this.screenshotPromises.push(
      browser.saveScreenshot(filePath)
        .then(() => this.#log(`- Screenshot (frame: ${frame})`))
        .catch((error: Error) => {
          fs.writeFileSync(filePath, notAvailableImage, 'base64')
          this.#log(`Screenshot not available (frame: ${frame}). Error: ${error}..`)
        })
    )
  }

  clearScreenshotInterval () {
    if (this.intervalScreenshot) {
      clearInterval(this.intervalScreenshot)
      this.intervalScreenshot = undefined
    }
  }

  generateVideo () {
    if (!this.testName) {
      return
    }

    const formatSettings = getVideoFormatSettings(this.options.videoFormat)
    const videoPath = getVideoPath(this.#outputDir, this.testName, formatSettings.fileExtension)
    this.videos.push(videoPath)

    // send event to nice-html-reporter
    // @ts-expect-error
    process.emit('test:video-capture', videoPath)

    const frameCheckPromise = glob(`${this.recordingPath}/*.png`).then((frames) => {
      const insertionPromises: Promise<void>[] = []

      const insertMissing = (sourceFrame: number, targetFrame: number) => {
        const src = `${this.recordingPath}/${pad(sourceFrame)}.png`
        const dest = `${this.recordingPath}/${pad(targetFrame)}.png`
        this.#log(`copying ${pad(sourceFrame)} to missing frame ${pad(targetFrame)}...`)
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
      '-vf', `"scale=${this.options.videoScale}","setpts=${this.options.videoSlowdownMultiplier}.0*PTS"`,
      `"${videoPath}"`,
    ]
    this.#log(`ffmpeg command: ${command} ${args.join(' ')}`)

    const start = Date.now()
    const promise: Promise<void> = Promise
      .all(this.screenshotPromises)
      .then(() => frameCheckPromise)
      .then(() => new Promise((resolve) => {
        const cp = spawn(command, args, {
          stdio: 'ignore',
          shell: true,
          windowsHide: true,
        })
        cp.on('close', () => {
          this.#log(`Generated video: "${videoPath}" (${Date.now() - start}ms)`)
          return resolve()
        })
      }))

    this.videoPromises.push(promise)
    return promise
  }

  #extendAllureReport () {
    if (!this.#usingAllure) {
      return
    }
    const capabilities = getCurrentCapabilities(browser)
    const deviceName = capabilities['appium:deviceName']
    if (deviceName) {
      this.#allureReporter.addArgument('deviceName', deviceName)
    }
    if (capabilities.browserVersion) {
      this.#allureReporter.addArgument('browserVersion', capabilities.browserVersion)
    }
  }

  #setRecordingPath () {
    const fullName = this.testNameStructure.slice(1)
      .reduce((cur, acc) => cur + '--' + acc, this.testNameStructure[0] || 'unknown')

    let browserName = 'browser'
    const capabilities = getCurrentCapabilities(browser)

    const deviceName = capabilities['appium:deviceName']
    if (capabilities.browserName) {
      browserName = capabilities.browserName.toUpperCase()
    } else if (deviceName && capabilities.platformName) {
      browserName = `${deviceName.toUpperCase()}-${capabilities.platformName.toUpperCase()}`
    }

    const testName = this.testName = generateFilename(this.options.maxTestNameCharacters, browserName, fullName)
    this.frameNr = 0
    this.recordingPath = path.resolve(this.#outputDir ?? this.options.outputDir, this.options.rawPath, testName)

    fs.mkdirSync(this.recordingPath, { recursive: true })
  }

  #log (...args: string[]) {
    this.write(`[${new Date().toISOString()}] ${args.join(' ')}\n`)
  }
}
