import path from 'node:path'
import fss from 'node:fs'

import logger from '@wdio/logger'
import type { Capabilities } from '@wdio/types'

import type { VideoFileExtension } from './types.js'
import { SUPPORTED_VIDEO_FORMATS, SCREENSHOT_PADDING_WITH } from './constants.js'

const log = logger('wdio-video-reporter:helpers')

export function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(1024)), 0, 0, ms)
}

export function generateFilename (maxTestNameCharacters: number, browserName: string, fullName: string) {
  const date = new Date()
  const msec = ('000' + date.getMilliseconds()).slice(-3)
  const timestamp = date.toLocaleString('iso', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/[ ]/g, '--').replace(/:|\//g, '-') + `-${msec}`

  let filename = encodeURIComponent(`${fullName.replace(/\s+/g, '-')}--${browserName}--${timestamp}`)
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

export function waitForVideosToExist (videos: string[], abortTime: number) {
  let allExist = false
  let allGenerated = false

  do {
    sleep(100)
    allExist = videos
      .map(v => fss.existsSync(v))
      .reduce((acc, cur) => acc && cur, true)

    if (allExist) {
      allGenerated = videos
        .map(v => fss.statSync(v).size)
        .reduce((acc, cur) => acc && cur > 48, true)
    }
  } while (Date.now() < abortTime && !(allExist && allGenerated))

  if (new Date().getTime() >= abortTime && !(allExist && allGenerated)) {
    log.debug(`abortTime exceeded while waiting for videos to exist.\n`)
  }
}

interface VideoSizes {
  filename: string
  size: number
}
export function waitForVideosToBeWritten (videos: string[], abortTime: number) {
  let allSizes: (VideoSizes | VideoSizes[])[] = []
  let allConstant = false

  /**
   * ToDo(Christian): simplify this
   */
  do {
    sleep(100)
    const currentSizes = videos.map(filename => ({
      filename,
      size: fss.statSync(filename).size
    }))

    allSizes = [...allSizes, currentSizes].slice(-3)

    allConstant = allSizes.length === 3 && currentSizes
      .reduce((accOuter, curOuter) => accOuter && allSizes
        .reduce((accFilter, curFilter) => [
          ...(accFilter as VideoSizes[]),
          (curFilter as VideoSizes[]).filter(v => v.filename === curOuter.filename).pop()!
        ], [] as (VideoSizes | VideoSizes[])[])
        .map((v) => (v as VideoSizes).size)
        .reduce((accInner, curInner) => accInner && curInner === curOuter.size, true), true)
  } while(Date.now() < abortTime && !allConstant)
}

export function getCurrentCapabilities (browser: WebdriverIO.Browser) {
  const mrCaps = browser.capabilities as Capabilities.MultiRemoteCapabilities
  const w3cCaps = browser.capabilities as Capabilities.W3CCapabilities
  const currentCapabilities: WebdriverIO.Capabilities = browser.isMultiremote
    ? mrCaps[Object.keys(browser.capabilities)[0]]
    : w3cCaps.alwaysMatch || browser.capabilities as WebdriverIO.Capabilities
  return currentCapabilities
}

export function pad (frameNumber: number) {
  return frameNumber.toString().padStart(SCREENSHOT_PADDING_WITH, '0')
}
