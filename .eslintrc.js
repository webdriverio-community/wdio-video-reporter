module.exports = {
  root: true,
  'env': {
    'node': true
  },
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended'
  ],
  // add your custom rules here
  rules: {
    'semi': 1,
    'no-useless-escape': 0,
    'function-paren-newline': 0,
    'no-multi-spaces': 0,
    'object-curly-newline': 0,
    'prefer-destructuring': 0,
    'no-param-reassign': 0,
    'no-mixed-operators': 0,
    'no-unused-vars': 1,
    'no-plusplus': 0,
    'no-console': 0,
    'prefer-template': 0,
    'import/no-extraneous-dependencies': 0,
    'import/extensions': 0,
    'class-methods-use-this': 0,
    'consistent-return': 0,
    'no-restricted-syntax': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'max-len': ['warn', 140, { 'ignoreComments': true }],
    'quote-props': ['error', 'as-needed'],
    'comma-dangle': ['error', {
      'arrays': 'always-multiline',
      'objects': 'always-multiline',
    }],
    'one-var': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    'no-var': 2,
  },
  globals:{
    window: true,
    document: true,
    jest: true,
    describe: true,
    fdescribe: true,
    xdescribe: true,

    beforeAll: true,
    afterAll: true,

    beforeEach: true,
    afterEach: true,

    it: true,
    fit: true,
    xit: true,

    expect: true,
    spyOn: true,

    $: true,
    browser: true,
    Promise: true,
  }
}
