import { Launcher } from '@wdio/cli'

export const config: WebdriverIO.Config = {
  // ===============
  // Custom settings
  // ===============
  reporters: ['spec'],

  // ============
  // Capabilities
  // ============
  capabilities: [{
    browserName: 'chrome',
  }],

  // ==================
  // Some nice defaults
  // ==================
  specs: [
    './specs/**/*.e2e.ts',
  ],
  bail: 1,
  framework: 'mocha',

  async onPrepare () {
    const mochaDemo = new Launcher('../demo/wdio.conf.ts', {})
    const cucumberDemo = new Launcher('../demo/wdio.cucumber.conf.ts', {})
    return Promise.all([
      mochaDemo.run(),
      cucumberDemo.run()
    ])
  }
}
