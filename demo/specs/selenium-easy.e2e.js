describe('User interactions', () => {
  beforeEach(() => {
    browser.url('http://www.seleniumeasy.com/test/');
    $('#btn_basic_example').click();
  });

  it('should be able to edit input (should pass)', () => {
    $('.list-group-item[href*="basic-first-form-demo"]').click();

    $('#get-input input').setValue('Presidenten');
    $('#get-input button').click();

    const name = $('#user-message #display').getText();
    expect(name).toBe('Presidenten');
  });


  it('should be able to move slider (fails by design to gen video)', () => {
    $('#advanced_example').click();
    $('.list-group-item[href*="drag-drop-range"]').click();

    $('#slider1 input').click();

    const range = $('#slider1 #range').getText();
    expect(range).toBe(30);
  });


  it('should be able to multi-select in dropdown (fails by design to gen video)', () => {
    $('.list-group-item[href^="./basic-select-dropdown"]').click();

    const modifierKey = process.platform == 'darwin' ? 'Meta' : 'Control';
    browser.keys(modifierKey);
    $('#multi-select option[value="Florida"]').click();
    $('#multi-select option[value="Ohio"]').click();
    $('#multi-select option[value="Texas"]').click();

    $('#printAll').click();

    browser.execute(() => document.querySelector('.getall-selected').scrollIntoView());

    const values = $('.getall-selected').getText();

    expect(values.includes('Florida')).toBe(true);
    expect(values.includes('Ohio')).toBe(true);
    expect(values.includes('Texas')).toBe(true);
  });
});

describe('Reporter bug fixes (should pass)', () => {
  beforeEach(() => {
    browser.url('http://www.seleniumeasy.com/test/');
  });

  it('should handle modals blocking screenshots', () => {
    browser.url('https://www.seleniumeasy.com/test/javascript-alert-box-demo.html');

    $('button.btn.btn-default').click();
    browser.acceptAlert();
    $('button.btn.btn-default.btn-lg').click();
    browser.acceptAlert();
   });
});
