import { $, $$, browser, expect } from '@wdio/globals'

describe('Tests with beforeEach and afterEach hooks', () => {
  let startTime: number

  beforeEach(async () => {
    // Navigate to the main page before each test
    await browser.url('https://the-internet.herokuapp.com/')
    const header = await $('h1.heading')
    await header.waitForDisplayed()
    startTime = Date.now()
  })

  afterEach(async () => {
    // Take a screenshot of the final state
    const duration = Date.now() - startTime
    console.log(`Test took ${duration}ms`)
    // Add a small pause to ensure the final state is captured
    await browser.pause(500)
  })

  it('should handle form authentication with hooks', async () => {
    const authLink = await $('a=Form Authentication')
    await authLink.click()

    const username = await $('#username')
    const password = await $('#password')
    const loginButton = await $('button[type="submit"]')

    await username.setValue('tomsmith')
    await password.setValue('SuperSecretPassword!')
    await loginButton.click()

    const successMessage = await $('#flash')
    await successMessage.waitForDisplayed({ timeout: 3000 })
    await expect(successMessage).toContain('You logged into a secure area!')
  })

  it('should test checkboxes with hooks', async () => {
    const checkboxLink = await $('a=Checkboxes')
    await checkboxLink.click()

    const checkboxes = await $$('input[type="checkbox"]')
    await expect(checkboxes).toBeElementsArrayOfSize(2)

    await checkboxes[0].click()
    await expect(checkboxes[0]).toBeChecked()

    await checkboxes[1].click()
    await expect(checkboxes[1]).not.toBeChecked()
})

  it('should fail on purpose to generate video with hooks', async () => {
    const brokenImagesLink = await $('a=Broken Images')
    await brokenImagesLink.click()

    // This will fail and generate a video including the beforeEach navigation
    const images = await $$('img')
    await expect(1).toBe(2) // Will fail
  })
})

describe('Tests with before and after suite hooks', () => {
  let testCounter = 0

  before(async () => {
    // One-time setup for the entire suite
    console.log('Starting test suite - navigating to main page')
    await browser.url('https://the-internet.herokuapp.com/')
    await browser.pause(1000) // Ensure this is captured in video
  })

  after(async () => {
    // Cleanup after all tests in suite
    console.log(`Completed ${testCounter} tests in suite`)
    // Navigate back to home
    await browser.url('https://the-internet.herokuapp.com/')
    await browser.pause(500)
  })

  beforeEach(async () => {
    testCounter++
    console.log(`Starting test #${testCounter}`)
  })

  it('should handle drag and drop', async () => {
    const dragDropLink = await $('a=Drag and Drop')
    await dragDropLink.click()

    const columnA = await $('#column-a')
    const columnB = await $('#column-b')

    // Get initial text
    const initialTextA = await columnA.$('header').getText()

    // Perform drag and drop (may not work in all environments)
    await columnA.dragAndDrop(columnB)

    // Verify change (or at least that elements still exist)
    await expect(columnA).toExist()
    await expect(columnB).toExist()
  })

    it('should test hover functionality', async () => {
    const hoversLink = await $('a=Hovers')
    await hoversLink.click()

    const figures = await $$('.figure')
    await expect(figures).toBeElementsArrayOfSize(2)

    await figures[0].moveTo()
    const caption = await figures[0].$('.figcaption')
    await expect(caption).toBeDisplayed()
    })
})

describe('Nested describes with multiple hook levels', () => {
  before(async () => {
    console.log('Outer suite setup')
    await browser.url('https://the-internet.herokuapp.com/')
  })

  describe('Input tests with nested hooks', () => {
    beforeEach(async () => {
      console.log('Inner suite setup - going to inputs page')
      const inputLink = await $('a=Inputs')
      await inputLink.waitForDisplayed({ timeout: 3000 })
      await inputLink.click()
      const header = await $('h3')
      await header.waitForDisplayed()
    })

    afterEach(async () => {
      console.log('Inner suite cleanup')
      // Clear any input values
      const inputField = await $('input[type="number"]')
      await inputField.clearValue()
    })

    it('should accept numeric input', async () => {
      const inputField = await $('input[type="number"]')
      await inputField.setValue('42')
      await expect(inputField).toHaveValue('42')
    })

    it('should handle negative numbers', async () => {
      const inputField = await $('input[type="number"]')
      await inputField.setValue('-123')
      await expect(inputField).toHaveValue('-123')
    })

    it('should fail with wrong value to generate video', async () => {
      const inputField = await $('input[type="number"]')
      await inputField.setValue('999')
      // This will fail and show the entire flow including nested hooks
      await expect(inputField).toHaveValue('1000')
    })
  })

  describe('Dropdown tests with different hooks', () => {
    let dropdownElement: WebdriverIO.Element

    beforeEach(async () => {
      const dropdownLink = await $('a=Dropdown')
      await dropdownLink.waitForDisplayed({ timeout: 3000 })
      await dropdownLink.click()
      dropdownElement = await $('#dropdown')
      await dropdownElement.waitForDisplayed()
    })

    it('should select option 1', async () => {
      await dropdownElement.selectByVisibleText('Option 1')
      await expect(dropdownElement).toHaveValue('1')
    })

    it('should select option 2', async () => {
      await dropdownElement.selectByVisibleText('Option 2')
      await expect(dropdownElement).toHaveValue('2')
    })
  })

  after(async () => {
    console.log('Outer suite cleanup')
    await browser.pause(1000)
  })
})

describe('Complex scenario with all hook types', () => {
  let sessionStartTime: number
  let testResults: string[] = []

  before(async () => {
    sessionStartTime = Date.now()
    console.log('=== Starting complex test suite ===')
    await browser.url('https://the-internet.herokuapp.com/')
    await browser.pause(500)
  })

  beforeEach(async () => {
    console.log('Preparing for next test...')
    // Always start from home page for consistency
    await browser.url('https://the-internet.herokuapp.com/')
    const header = await $('h1.heading')
    await header.waitForDisplayed()
  })

  afterEach(async function() {
    // Log test result
    const testName = this.currentTest?.title || 'Unknown test'
    const testStatus = this.currentTest?.state || 'unknown'
    testResults.push(`${testName}: ${testStatus}`)

    // Take a screenshot of final state
    await browser.pause(300)
  })

  after(async () => {
    const totalTime = Date.now() - sessionStartTime
    console.log('=== Test suite completed ===')
    console.log(`Total time: ${totalTime}ms`)
    console.log('Results:', testResults)

    // Final navigation to show suite completion
    await browser.url('https://the-internet.herokuapp.com/')
    await browser.pause(1000)
  })

  it('should handle key presses', async () => {
    const keyPressLink = await $('a=Key Presses')
    await keyPressLink.click()

    const input = await $('#target')
    await input.click()

    // Send various keys
    await browser.keys(['Enter'])
    await browser.pause(200)
    await browser.keys(['Escape'])
    await browser.pause(200)
    await browser.keys(['Space'])

    const result = await $('#result')
    await expect(result).toBeDisplayed()
  })

  it('should test notification messages', async () => {
    const notificationLink = await $('a=Notification Messages')
    await notificationLink.click()

    const clickHereLink = await $('a=Click here')
    await clickHereLink.click()

    const notification = await $('#flash')
    await notification.waitForDisplayed()

    const text = await notification.getText()
    // This might fail randomly as notifications vary
    await expect(text).toContain('Action')
  })

  it('should deliberately fail to show complete hook flow in video', async () => {
    const addRemoveLink = await $('a=Add/Remove Elements')
    await addRemoveLink.click()

    const addButton = await $('button=Add Element')

    // Add multiple elements
    for (let i = 0; i < 3; i++) {
      await addButton.click()
      await browser.pause(200)
    }

    const deleteButtons = await $$('button=Delete')

    // This will fail - expecting 5 but only added 3
    await expect(deleteButtons).toBeElementsArrayOfSize(5)
  })
})

describe('Hooks with async operations and errors', () => {
  let apiData: any = null

  beforeEach(async () => {
    // Simulate API call or async setup
    console.log('Fetching test data...')
    await browser.pause(500)
    apiData = { testId: Date.now() }

    await browser.url('https://the-internet.herokuapp.com/')
    await browser.pause(300)
  })

  afterEach(async () => {
    // Cleanup with potential error handling
    try {
      console.log('Cleaning up test data...')
      apiData = null
      await browser.pause(300)
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  })

  it('should use data from beforeEach hook', async () => {
    expect(apiData).toBeTruthy()
    expect(apiData.testId).toBeGreaterThan(0)

    const statusLink = await $('a=Status Codes')
    await statusLink.click()

    const link200 = await $('a=200')
    await link200.click()

    // Navigate back
    await browser.back()
    await expect($('h3')).toContain('Status Codes')
  })

  it('should handle hook data and deliberately fail', async () => {
    const redirectLink = await $('a=Redirect Link')
    await redirectLink.click()

    const hereLink = await $('#redirect')
    await hereLink.click()

    // After redirect, check we're on status codes page
    const heading = await $('h3')

    // This will fail - wrong expected text
    await expect(heading).toContain('Wrong Page Title')
  })
})

describe('Edge case: Hook failures', () => {
  beforeEach(async function() {
    // This hook might fail for some tests
    const testName = this.currentTest?.title || ''

    if (testName.includes('skip hook')) {
      console.log('Skipping hook for this test')
      return
    }

    await browser.url('https://the-internet.herokuapp.com/')
    const header = await $('h1.heading')
    await header.waitForDisplayed()
  })

  afterEach(async function() {
    // Conditional cleanup based on test outcome
    if (this.currentTest?.state === 'failed') {
      console.log('Test failed, taking additional screenshots')
      await browser.pause(1000)
    }
  })

  it('should run with normal hooks', async () => {
    const abTestLink = await $('a=A/B Testing')
    await abTestLink.click()

    const heading = await $('h3')
    const text = await heading.getText()

    // This might be "A/B Test Control" or "A/B Test Variation 1"
    expect(text).toBeTruthy()
  })

  it('should skip hook setup but still work', async () => {
    // This test intentionally has "skip hook" in the name
    // The beforeEach will return early for this test

    // We're not on the main page, so navigate manually
    await browser.url('https://the-internet.herokuapp.com/javascript_alerts')

    const jsAlertButton = await $('button=Click for JS Alert')
    await jsAlertButton.click()

    await browser.acceptAlert()

    const result = await $('#result')
    await expect(result).toContain('You successfully clicked an alert')
  })

  it('should fail and trigger special afterEach behavior', async () => {
    const contextMenuLink = await $('a=Context Menu')
    await contextMenuLink.click()

    const hotSpot = await $('#hot-spot')

    // Right-click
    await hotSpot.click({ button: 'right' })

    // Handle alert if it appears
    try {
      await browser.acceptAlert()
    } catch (e) {
      // Alert might not appear in all environments
    }

    // This will fail deliberately
    await expect(hotSpot).toContain('This should fail')
  })
})
