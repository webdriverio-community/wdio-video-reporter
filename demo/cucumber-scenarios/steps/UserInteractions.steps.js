import { Given, When, Then } from '@wdio/cucumber-framework';
import {assert} from 'chai';

Given(/^I navigate to base url$/, async() => {
  await browser.url('https://demo.seleniumeasy.com');
});

Given(/^I close close ad-popups$/, async() => {
  const lightbox = '#at-cv-lightbox-close';
  try {
    await browser.pause(500); // avoid animation effect
    await $(lightbox).waitForExist({ timeout: 2000 });
    await browser.pause(500); // avoid animation effect
    if (await $(lightbox).isExisting()) {
      await $(lightbox).click();
    }
  } catch(_) {
    // Didnt get random interupting popup
  }
});

Given(/^I open Basic Examples tab$/, async() => {
  await $('#btn_basic_example').click();
  await browser.pause(300); // avoid animation effect
});

Given(/^I open Advanced Examples tab$/, async() => {
  await $('#advanced_example').click();
  await browser.pause(300); // avoid animation effect
});

When(/I open '(.+)' demo$/, async(demo) => {
  await $(`.list-group-item[href*="${demo}"]`).click();
});

When(/I enter message '(.+)'$/, async(message) => {
  await $('#get-input input').setValue(message);
});

When(/I click 'Show Message'$/, async() => {
  await $('#get-input button').click();
  await $('#get-input button').click();
});

Then(/My message '(.+)' should be displayed$/, async(message) => {
  let name = await $('#user-message #display').getText();
  assert.equal(name, message);
});

When(/I click first slider$/, async() => {
  await $('#slider1 input').click();
});

Then(/Slider range should be '(.+)'$/, async(expected) => {
  let range = await $('#slider1 #range').getText();
  assert.equal(range, expected);
});
