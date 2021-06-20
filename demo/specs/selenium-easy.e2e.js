describe('User interactions', () => {
  beforeEach(() => {
    browser.url('http://www.seleniumeasy.com/test/');
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

  it ('should be able to edit input (should pass)', () => {
    $('#btn_basic_example').click();
    browser.pause(300); // avoid animation effect

    $('.list-group-item[href*="basic-first-form-demo"]').click();

    $('#get-input input').setValue('Presidenten');
    $('#get-input button').click();
    $('#get-input button').click();

    const name = $('#user-message #display').getText();

    expect(name).toBe('Presidenten');
  });

  it('should be able to move slider (fails by design to gen video)', () => {
    $('#advanced_example').click();
    browser.pause(300); // avoid animation effect
    $('.list-group-item[href*="drag-drop-range"]').click();

    $('#slider1 input').click();

    const range = $('#slider1 #range').getText();
    expect(range).toBe(30);
  });

  it('should be able to multi-select in dropdown (fails by design to gen video)', () => {
    $('#btn_basic_example').click();
    browser.pause(300); // avoid animation effect

    $('.list-group-item[href^="./basic-select-dropdown"]').click();
    browser.execute(function() { document.querySelector('#multi-select').scrollIntoView(true); });

    const isDevice = browser.capabilities.deviceType;
    let modifierKey = 'Control';

    if (!isDevice) {
      if (browser.capabilities.platform === 'macOS' || browser.capabilities.platformName === 'macOS') {
        modifierKey = 'Meta';
      }

      browser.keys(modifierKey);
    }

    browser.execute(function() { document.querySelector('#multi-select').scrollIntoView(true); });
    $('select#multi-select option[value="Florida"]').click();
    $('select#multi-select option[value="Ohio"]').click();
    $('select#multi-select option[value="Texas"]').click();

    if (!isDevice) {
      browser.keys(modifierKey);
    }

    $('button#printAll').click();
    browser.pause(300);
    const values = $('.getall-selected').getText();
    expect(values.includes('Florida')).toBe(true);
    expect(values.includes('Ohio')).toBe(true);
    expect(values.includes('Texas')).toBe(true);
  });
});




describe('Reporter bug fixes (should pass)', () => {
  beforeEach(() => {
    browser.url('https://www.seleniumeasy.com/test/javascript-alert-box-demo.html');
    const lightbox = '#at-cv-lightbox-close';
    try {
      $(lightbox).waitForExist({ timeout: 500 });
      browser.pause(500); // avoid animation effect
      $(lightbox).click();
    } catch(_) {
      // Didnt get random interupting popup
    }
  });

  it('should handle modals blocking screenshots', () => {
    $('button.btn.btn-default').click();
    browser.pause(300);
    $('button.btn.btn-default.btn-lg').click();
    browser.pause(300);
   });
});
