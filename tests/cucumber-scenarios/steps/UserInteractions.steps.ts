import { Given, When, Then } from '@wdio/cucumber-framework'
import { browser } from '@wdio/globals'

Given(/^I navigate to base url$/, async () => {
  await browser.url('https://demo.seleniumeasy.com')
})

Given(/^I close close ad-popups$/, async () => {
  const lightbox = await $('#at-cv-lightbox-close')
  await lightbox.waitForExist()
  await $(lightbox).click().catch(() => {
    // ignore
  })
})

Given(/^I open Basic Examples tab$/, async () => {
  await $('#btn_basic_example').click()
})

Given(/^I open Advanced Examples tab$/, async () => {
  await $('#advanced_example').click()
})

When(/I open '(.+)' demo$/, async (demo) => {
  await $(`.list-group-item[href*="${demo}"]`).click()
})

When(/I enter message '(.+)'$/, async (message) => {
  await $('#get-input input').setValue(message)
})

When(/I click 'Show Message'$/, async () => {
  await $('#get-input button').click()
  await $('#get-input button').click()
})

Then(/My message '(.+)' should be displayed$/, async (message) => {
  await expect($('#user-message #display')).toHaveText(message)
})

When(/I click first slider$/, async () => {
  await $('#slider1 input').click()
})

Then(/Slider range should be '(.+)'$/, async (message) => {
  await expect($('#slider1 #range')).toHaveText(message)
})
