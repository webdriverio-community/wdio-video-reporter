describe('User interactions', () => {
  beforeEach(async() => {
    await browser.url('https://demo.seleniumeasy.com');
    const basicExampleButton = await $('#btn_basic_example');
    try {
      await browser.pause(500); // avoid animation effect
      await $(basicExampleButton).waitForExist({ timeout: 2000 });
      await browser.pause(500); // avoid animation effect
      if (await $(basicExampleButton).isExisting()) {
        await $(basicExampleButton).click();
      }
    } catch(_) {
      // Didnt get random interrupting popup
    }
  });

  it ('should be able to edit input (should pass)', async() => {
    await browser.pause(300); // avoid animation effect
    await $('.list-group-item[href*="basic-first-form-demo"]').click();

    await $('form #user-message').setValue('Presidenten');
    await $('form .btn').click();

    const name = await $('#user-message #display').getText();

    expect(name).toBe('Presidenten');
  });

  it('should be able to move slider (fails by design to gen video)', async() => {
    await $('#advanced_example').click();
    await browser.pause(300); // avoid animation effect
    await $('.list-group-item[href*="drag-drop-range"]').click();

    await $('#slider1 input').click();

    const range = await $('#slider1 #range').getText();
    expect(range).toBe(30);
  });

  it('should be able to multi-select in dropdown (fails by design to gen video)', async() => {
    await browser.pause(300); // avoid animation effect

    await $('.list-group-item[href^="./basic-select-dropdown"]').click();
    await browser.execute(function() { document.querySelector('#multi-select').scrollIntoView(true); });

    const isDevice = browser.capabilities.deviceType;
    let modifierKey = 'Control';

    if (!isDevice) {
      if (browser.capabilities.platform === 'macOS' || browser.capabilities.platformName === 'macOS') {
        modifierKey = 'Meta';
      }

      await browser.keys(modifierKey);
    }

    await browser.execute(function() { document.querySelector('#multi-select').scrollIntoView(true); });
    await $('select#multi-select option[value="Florida"]').click();
    await $('select#multi-select option[value="Ohio"]').click();
    await $('select#multi-select option[value="Texas"]').click();

    if (!isDevice) {
      await browser.keys(modifierKey);
    }

    await $('button#printAll').click();
    await browser.pause(300);
    const values = await $('.getall-selected').getText();
    expect(values.includes('Florida')).toBe(true);
    expect(values.includes('Ohio')).toBe(true);
    expect(values.includes('Texas')).toBe(true);
  });
});




describe('Reporter bug fixes (should pass)', () => {
  beforeEach(async() => {
    await browser.url('https://demo.seleniumeasy.com/javascript-alert-box-demo.html');
    const lightbox = '#at-cv-lightbox-close';
    try {
      await $(lightbox).waitForExist({ timeout: 500 });
      await browser.pause(500); // avoid animation effect
      await $(lightbox).click();
    } catch(_) {
      // Didnt get random interrupting popup
    }
  });

  it('should handle modals blocking screenshots', async() => {
    await $('button.btn.btn-default').click();
    await browser.pause(300);
    await $('button.btn.btn-default.btn-lg').click();
    await browser.pause(300);
   });
});
