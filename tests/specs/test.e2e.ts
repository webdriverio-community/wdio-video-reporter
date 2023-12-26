import { browser, expect } from '@wdio/globals'
import { Key } from 'webdriverio'

describe('User interactions', () => {
  beforeEach(async () => {
    await browser.url('https://demo.seleniumeasy.com')
    const basicExampleButton = await $('#btn_basic_example')
    await $(basicExampleButton).click()
  })

  it('should be able to edit input (should pass)', async() => {
    await $('.list-group-item[href*="basic-first-form-demo"]').click()
    await $('form #user-message').setValue('WDIO Video Reporter rocks!')
    await $('form .btn').click()

    await expect($('#user-message #display')).toHaveText('WDIO Video Reporter rocks!')
  })

  it('should be able to move slider (fails by design to gen video)', async() => {
    await $('#advanced_example').click()
    await $('.list-group-item[href*="drag-drop-range"]').click()
    await $('#slider1 input').click()
    await expect($('#slider1 #range')).toHaveText('51')
  })

  it('should be able to multi-select in dropdown (fails by design to gen video)', async() => {
    await $('.list-group-item[href^="./basic-select-dropdown"]').click()
    await $('#multi-select').scrollIntoView(true)

    await browser.keys(Key.Ctrl)

    await $('#multi-select').scrollIntoView(true)
    await $('select#multi-select option[value="Florida"]').click()
    await $('select#multi-select option[value="Ohio"]').click()
    await $('select#multi-select option[value="Texas"]').click()

    await browser.keys(Key.Ctrl)

    await $('button#printAll').click()
    const values = await $('.getall-selected').getText()
    expect(values.includes('Florida')).toBe(true)
    expect(values.includes('Ohio')).toBe(true)
    expect(values.includes('Texas')).toBe(true)
  })
})
