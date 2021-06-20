import { Given, When, Then } from '@cucumber/cucumber';
import {assert} from 'chai';

Given(/^I navigate to base url$/, () => {
  browser.url('http://www.seleniumeasy.com/test/');
});

Given(/^I close close ad-popups$/, () => {
  const lightbox = '#at-cv-lightbox-close';
  try {
    browser.pause(500); // avoid animation effect
    $(lightbox).waitForExist({ timeout: 2000 });
    browser.pause(500); // avoid animation effect
    if ($(lightbox).isExisting()) {
      $(lightbox).click();
    }
  } catch(_) {
    // Didnt get random interupting popup
  }
});

Given(/^I open Basic Examples tab$/, () => {
  $('#btn_basic_example').click();
  browser.pause(300); // avoid animation effect
});

Given(/^I open Advanced Examples tab$/, () => {
  $('#advanced_example').click();
  browser.pause(300); // avoid animation effect
});

When(/I open '(.+)' demo$/, (demo) => {
  $(`.list-group-item[href*="${demo}"]`).click();
});

When(/I enter message '(.+)'$/, (message) => {
  $('#get-input input').setValue(message);
});

When(/I click 'Show Message'$/, () => {
  $('#get-input button').click();
  $('#get-input button').click();
});

Then(/My message '(.+)' should be displayed$/, (message) => {
  let name = $('#user-message #display').getText();
  assert.equal(name, message);
});

When(/I click first slider$/, () => {
  $('#slider1 input').click();
});

Then(/Slider range should be '(.+)'$/, (expected) => {
  let range = $('#slider1 #range').getText();
  assert.equal(range, expected);
});
