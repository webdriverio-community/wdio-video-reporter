import fs from 'node:fs'

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { addAttachment, addArgument } from '@wdio/allure-reporter'
import { browser } from '@wdio/globals'

import VideoReporter from './index.js'

vi.mock('node:fs', () => {
  const mod = {
    writeFileSync: vi.fn(),
    createWriteStream: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
  }
  return {
    ...mod,
    default: mod
  }
})

vi.mock('node:fs/promises', () => ({}))

vi.mock('glob', () => ({
  glob: () => Promise.resolve(['/foo/bar.js', '/foo/baz.js'])
}))

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/foo/bar/ffmpeg'
}))

vi.mock('@wdio/reporter', () => ({
  default: class {
    options: unknown
    constructor (options: unknown) {
      this.options = options
    }
  }
}))

vi.mock('@wdio/allure-reporter', () => ({
  addAttachment: vi.fn(),
  addArgument: vi.fn()
}))

vi.mock('@wdio/globals', () => ({
  browser: {
    capabilities: {
      browserName: 'chrome',
      browserVersion: '1.2.3'
    },
    acceptAlert: vi.fn().mockResolvedValue({}),
    getAlertText: vi.fn().mockResolvedValue({}),
    saveScreenshot: vi.fn().mockResolvedValue({})
  }
}))

const sleep = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))

const allureRunner: any = {
  isMultiremote: false,
  sessionId: '1234',
  instanceOptions: {
    1234: {
      reporters: [['allure', { outputDir: '/foo/bar' }]]
    }
  }
}

describe('Video Reporter', () => {
  const processOn = process.on.bind(process)
  beforeEach(() => {
    process.on = vi.fn()
    vi.mocked(addAttachment).mockClear()
    vi.mocked(addArgument).mockClear()
    vi.mocked(browser.saveScreenshot).mockClear()
    vi.mocked(browser.getAlertText).mockClear()
    vi.mocked(fs.mkdirSync).mockClear()
  })
  afterEach(() => {
    process.on = processOn
  })

  it('sets screenshotIntervalSecs', () => {
    const options = { screenshotIntervalSecs: 2 }
    const reporter = new VideoReporter(options)
    expect(reporter.options.screenshotIntervalSecs).toBe(2)
  })

  it('sets screenshotIntervalSecs to max of 0.5s', () => {
    const options = { screenshotIntervalSecs: 0.1 }
    const reporter = new VideoReporter(options)
    expect(reporter.options.screenshotIntervalSecs).toBe(0.5)
  })

  it('onRunnerStart', () => {
    const reporter = new VideoReporter({})
    reporter.onRunnerStart(allureRunner)
    expect(reporter.allureOutputDir).toBe('/foo/bar')
    expect(vi.mocked(process.on)).toBeCalledTimes(1)
  })

  it('onBeforeCommand', async () => {
    const reporter = new VideoReporter({})
    expect(reporter.allureVideos).toEqual([])

    reporter.testName = 'testName'
    reporter.onRunnerStart(allureRunner)
    reporter.onBeforeCommand()
    expect(reporter.allureVideos).not.toEqual([])
    await sleep()
    expect(addAttachment).toBeCalledWith(
      'Execution video',
      expect.stringMatching(/testName.webm$/),
      'video/webm'
    )
  })

  describe('onAfterCommand', () => {
    it('should do nothing if unknown command', () => {
      const reporter = new VideoReporter({})
      reporter.recordingPath = '/foo/bar'
      reporter.onAfterCommand({ endpoint: '/foo/bar' } as any)
      expect(browser.getAlertText).toBeCalledTimes(0)
    })

    it('should do nothing if command is not included in snapshotCommands list', () => {
      const reporter = new VideoReporter({})
      reporter.recordingPath = '/foo/bar'
      reporter.onAfterCommand({ endpoint: '/session/1234/foo' } as any)
      expect(browser.getAlertText).toBeCalledTimes(0)
    })

    it('should do nothing if command is excluded', () => {
      const reporter = new VideoReporter({
        excludedActions: ['click']
      })
      reporter.recordingPath = '/foo/bar'
      reporter.onAfterCommand({ endpoint: '/session/1234/click' } as any)
      expect(browser.getAlertText).toBeCalledTimes(0)
    })

    it('should do nothing if recordingPath is not set', () => {
      const reporter = new VideoReporter({})
      reporter.onAfterCommand({ endpoint: '/session/1234/click' } as any)
      expect(browser.getAlertText).toBeCalledTimes(0)
    })

    it('should add frame if no alert is displayed', async () => {
      const reporter = new VideoReporter({})
      reporter.recordingPath = '/foo/bar'
      await reporter.onAfterCommand({ endpoint: '/session/1234/click' } as any)
      expect(browser.getAlertText).toBeCalledTimes(1)
      expect(browser.saveScreenshot).toBeCalledTimes(1)
    })

    it('should add frame if recordAllActions is set', async () => {
      const reporter = new VideoReporter({ recordAllActions: true })
      reporter.recordingPath = '/foo/bar'
      await reporter.onAfterCommand({ endpoint: '/session/1234/foobar' } as any)
      expect(browser.getAlertText).toBeCalledTimes(1)
      expect(browser.saveScreenshot).toBeCalledTimes(1)
    })
  })

  describe('onSuiteStart', () => {
    it('should set testNameStructure for Cucumber', () => {
      const reporter = new VideoReporter({})
      reporter.onSuiteStart({ title: 'foo bar' } as any)
      expect(reporter.testNameStructure).toEqual([])

      reporter.isCucumberFramework = true
      reporter.onSuiteStart({ title: 'foo bar' } as any)
      expect(reporter.testNameStructure).toEqual(['foo-bar'])
      expect(reporter.recordingPath).toBeUndefined()
    })

    it('should set recordingPath if suite is scenario', () => {
      const reporter = new VideoReporter({})
      reporter.onSuiteStart({ title: 'foo bar', type: 'scenario' } as any)
      expect(reporter.recordingPath).toEqual(expect.stringContaining('/unknown--CHROME--'))
      reporter.isCucumberFramework = true
      reporter.onSuiteStart({ title: 'foo bar', type: 'scenario' } as any)
      expect(reporter.recordingPath).toEqual(expect.stringContaining('/foo-bar--CHROME--'))
    })
  })

  describe('onSuiteEnd', () => {
    it('extends Allure report', async () => {
      const reporter = new VideoReporter({})
      reporter.onSuiteEnd({} as any)
      await sleep()
      expect(addArgument).toBeCalledTimes(0)

      reporter.onRunnerStart(allureRunner)
      reporter.onSuiteEnd({} as any)
      await sleep()
      expect(addArgument).toBeCalledTimes(1)
      expect(addArgument).toBeCalledWith('browserVersion', '1.2.3')
    })

    it('should add frame if test failed', async () => {
      const reporter = new VideoReporter({})
      reporter.testName = 'foo bar'
      reporter.recordingPath = '/foo/bar'
      reporter.onRunnerStart(allureRunner)
      reporter.onSuiteEnd({ tests: [{ state: 'failed' }] } as any)
      await sleep()
      expect(browser.saveScreenshot).toBeCalledTimes(1)
      expect(fs.writeFileSync).toBeCalledTimes(0)
    })

    it('should add a blank frame if taking screenshot fails', async () => {
      vi.mocked(browser.saveScreenshot).mockRejectedValue(new Error('foobar'))
      const reporter = new VideoReporter({})
      reporter.testName = 'foo bar'
      reporter.recordingPath = '/foo/bar'
      reporter.onRunnerStart(allureRunner)
      reporter.onSuiteEnd({ tests: [{ state: 'failed' }] } as any)
      await sleep()
      expect(browser.saveScreenshot).toBeCalledTimes(1)
      expect(fs.writeFileSync).toBeCalledTimes(1)
    })
  })

  describe('onTestStart', () => {
    beforeAll(() => {
      vi.useFakeTimers()
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    it('calls mkdirSync', () => {
      const reporter = new VideoReporter({})
      reporter.onTestStart({ title: 'foo bar' } as any)
      expect(fs.mkdirSync).toBeCalledWith(
        expect.stringContaining('/foo-bar--CHROME--'),
        { recursive: true }
      )
    })

    it('adds a frame on interval', () => {
      const reporter = new VideoReporter({ screenshotIntervalSecs: 1 })
      reporter.addFrame = vi.fn()
      reporter.onTestStart({ title: 'foo bar' } as any)
      vi.advanceTimersToNextTimer()
      expect(reporter.addFrame).toBeCalledTimes(1)
    })
  })

  describe('onTestSkip', () => {
    it('clears intervalScreenshot', () => {
      const reporter = new VideoReporter({})
      reporter.intervalScreenshot = 1234 as any
      reporter.onTestSkip()
      expect(reporter.intervalScreenshot).toBeUndefined()
    })
  })
})
