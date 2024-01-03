import { config as baseConfig } from './wdio.conf.js'

export const config: WebdriverIO.Config = {
  ...baseConfig,

  // =================
  // Cucumber settings
  // =================
  specs: [
    './cucumber-scenarios/**/*.feature',
  ],
  framework: 'cucumber',
  cucumberOpts: {
    require: ['./demo/cucumber-scenarios/steps/UserInteractions.steps.ts'],
    backtrace: false,
    compiler: [],
    dryRun: false,
    failFast: false,
    format: ['pretty'],
    colors: true,
    snippets: true,
    source: true,
    profile: [],
    strict: false,
    timeout: 60000,
    ignoreUndefinedDefinitions: false,
  }
}
