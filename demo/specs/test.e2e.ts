import { $, $$, browser, expect } from '@wdio/globals'

describe('User interactions', () => {
  beforeEach(async () => {
    await browser.url('https://the-internet.herokuapp.com/')
    const header = await $('h1.heading').getElement()
    await header.waitForDisplayed()
  })

  async function getHeader() {
    return await $('h3').getElement()
  }

  it('should be able to use inputs', async () => {
    // Open input
    const inputLink = await $('a=Inputs').getElement()
    await inputLink.click()

    await (await getHeader()).waitForDisplayed()

    const inputValue = '12344321'

    const inputField = await $('input').getElement()
    await inputField.setValue(inputValue)

    await expect(inputField).toHaveValue(inputValue)
  })

  it('should pick from dropdown menu (fails by design to gen video)', async () => {
    const inputLink = await $('a=Dropdown').getElement()
    await inputLink.click()
    await (await getHeader()).waitForDisplayed()

    const dropDown = await $('select#dropdown').getElement()
    const options = await $$('option').getElements()

    await dropDown.click()

    await options[2].click()

    await expect(dropDown).toHaveValue('Option 1')

  })

  it('should scroll a lot (fails by design to gen video)', async() => {
    const inputLink = await $('a=Infinite Scroll').getElement()
    await inputLink.click()
    await (await getHeader()).waitForDisplayed()

    for (let index = 0; index < 5; index++) {
      const paragraphs = await $$('div.jscroll-added').getElements()
      const lastParagraph = paragraphs[paragraphs.length - 1]
      await lastParagraph.scrollIntoView(true)
      await lastParagraph.click()
      await browser.pause(1000)
    }

    await expect(await $$('div.jscroll-added').getElements()).toBeElementsArrayOfSize(1)
  })
})