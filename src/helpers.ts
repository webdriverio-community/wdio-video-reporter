import path from 'node:path'
import fs from 'node:fs'

import logger from '@wdio/logger'
import type { Capabilities } from '@wdio/types'

import type { VideoFileExtension } from './types.js'
import { SUPPORTED_VIDEO_FORMATS, SCREENSHOT_PADDING_WITH, TO_LOCAL_STRING_OPTIONS } from './constants.js'

const log = logger('wdio-video-reporter:helpers')

export function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(1024)), 0, 0, ms)
}

export function generateFilename (maxTestNameCharacters: number, browserName: string, fullName: string) {
  const date = new Date()
  const msec = ('000' + date.getMilliseconds()).slice(-3)
  const timestamp = date.toLocaleString('iso', TO_LOCAL_STRING_OPTIONS)
    .replace(/[ ]/g, '--')
    .replace(/:|\//g, '-') + `-${msec}`

  const wdioWorkerText = process.env.WDIO_WORKER_ID ? `${process.env.WDIO_WORKER_ID}-` : ''
  let filename = encodeURIComponent(`${fullName.replace(/\s+/g, '-')}-${wdioWorkerText}-${browserName}--${timestamp}`)
    .replace(/%../g, '')
    .replace(/\./g, '-')
    .replace(/[/\\?%*:'|"<>()]/g, '')

  if (filename.length > maxTestNameCharacters) {
    const truncLength = (maxTestNameCharacters - 2)/2
    filename = filename.slice(0, truncLength) + '--' + filename.slice(-truncLength)
  }

  return filename
}

export function getVideoPath (outputDir: string, testName: string, ext: VideoFileExtension) {
  return path.resolve(outputDir, `${testName}.${ext}`)
}

export function getVideoFormatSettings (videoFormat: VideoFileExtension) {
  return SUPPORTED_VIDEO_FORMATS[videoFormat]
}

/**
 * wait for videos to be generated
 * @param videos     path to generated videos
 * @param abortTime  timeout in ms
 * @param sleepFn    sleep function (for testing purposes)
 */
export function waitForVideosToExist (videos: string[], abortTime: number, sleepFn = sleep) {
  const waitTime = 100
  const allExist = videos
    .map(v => fs.existsSync(v))
    .every(Boolean)

  let allGenerated = false
  if (allExist) {
    allGenerated = videos
      .map(v => fs.statSync(v).size)
      .reduce((acc, cur) => acc && cur > 48, true)
  }

  if (allGenerated) {
    return true
  }

  if (abortTime <= 0 && (!allExist || !allGenerated)) {
    log.debug('abortTime exceeded while waiting for videos to exist.\n')
    return false
  }

  sleepFn(waitTime)
  return waitForVideosToExist(videos, abortTime - waitTime, sleepFn)
}

/**
 * Wait for videos to be written, i.e. their size is not changing anymore
 * @param videos    path to generated videos
 * @param abortTime timeout in ms
 * @param sleepFn   sleep function (for testing purposes)
 */
export function waitForVideosToBeWritten (videos: string[], abortTime: number, sleepFn = sleep) {
  const start = Date.now()
  let currentSizes = videos.reduce((fileMap, filename) => {
    fileMap[filename] = fs.statSync(filename).size
    return fileMap
  }, {} as Record<string, number>)

  // eslint-disable-next-line no-constant-condition
  while ((Date.now() - start) <= abortTime) {
    sleepFn(100)
    const updatedSizes = videos.reduce((fileMap, filename) => {
      fileMap[filename] = fs.statSync(filename).size
      return fileMap
    }, {} as Record<string, number>)
    const hasChanged = Object.entries(currentSizes)
      .every(([filename, size]) => size !== updatedSizes[filename])
    if (!hasChanged) {
      return true
    }
    currentSizes = updatedSizes
  }

  log.debug('abortTime exceeded while waiting for videos to be written.\n')
  return false
}

export function getCurrentCapabilities (browser: WebdriverIO.Browser) {
  const mrCaps = browser.capabilities as Capabilities.MultiRemoteCapabilities
  const w3cCaps = browser.capabilities as Capabilities.W3CCapabilities
  const currentCapabilities: WebdriverIO.Capabilities = browser.isMultiremote
    ? mrCaps[Object.keys(browser.capabilities)[0]].capabilities as WebdriverIO.Capabilities
    : w3cCaps.alwaysMatch || browser.capabilities as WebdriverIO.Capabilities
  return currentCapabilities
}

export function pad (frameNumber: number) {
  return frameNumber.toString().padStart(SCREENSHOT_PADDING_WITH, '0')
}
