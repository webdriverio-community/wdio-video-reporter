import { Given, When, Then } from '@wdio/cucumber-framework'
import { browser, $, $$, expect } from '@wdio/globals'

async function getHeader() {
  return await $('h3').getElement()
}

Given('I navigate to base url', async () => {
  await browser.url('https://the-internet.herokuapp.com/')
})

Given(/^I open inputs page$/, async () => {
  const inputLink = await $('a=Inputs').getElement()
  await inputLink.click()
  await (await getHeader()).waitForDisplayed()
})

Given(/^I open dropdown page$/, async () => {
  const dropDownLink = await $('a=Dropdown').getElement()
  await dropDownLink.click()
  await (await getHeader()).waitForDisplayed()
})
Given(/^I open scrolling page$/, async () => {
  const scrollLink = await $('a=Infinite Scroll').getElement()
  await scrollLink.click()
  await (await getHeader()).waitForDisplayed()
})
When(/I enter message '(.+)'$/, async (message) => {
  const inputField = await $('input').getElement()
  await inputField.setValue(message)
  await browser.pause(1000)
})

When(/I select dropdown option '(.+)'$/, async (optionNumber) => {
  const dropDown = await $('select#dropdown').getElement()
  await dropDown.click()
  const options = await $$('option').getElements()
  await options[parseInt(optionNumber)].click()
})

When('I scroll a lot', async () => {
  for (let index = 0; index < 5; index++) {
    const paragraphs = await $$('div.jscroll-added').getElements()
    const lastParagraph = paragraphs[paragraphs.length - 1]
    await lastParagraph.scrollIntoView(true)
    await lastParagraph.click()
    await browser.pause(1000)
  }
})

Then(/My message '(.+)' should be displayed$/, async (message) => {
  const inputField = await $('input').getElement()
  await expect(inputField).toHaveValue(message)
})

Then(/Dropdown value should be '(.+)'$/, async (dropdownValue:string) => {
  const dropDown = await $('select#dropdown').getElement()
  await expect(dropDown).toHaveValue(dropdownValue)
})

Then(/Paragraph count should be '(.+)'$/, async (paragraphCount: number)=>{
  await expect(await $$('div.jscroll-added').getElements()).toBeElementsArrayOfSize(paragraphCount)
})
