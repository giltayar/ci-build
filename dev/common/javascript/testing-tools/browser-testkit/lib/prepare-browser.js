'use strict'
//@flow
const webdriver = require('selenium-webdriver');
const path = require('path');
const Promise = require('bluebird');
const assert = require('assert')

/*:: type SetupMochaFunctions = (Function) => void */

module.exports = function (before/*: SetupMochaFunctions*/, after/*: SetupMochaFunctions*/,
                          {expectNoConsoleLogs = true, outputAllDriverLogs = false}/*: {
                              outputAllDriverLogs: boolean,
                              expectNoConsoleLogs: boolean,
                            }*/ = {}) {
  const chromeDriverPathAddition = `:${path.dirname(require('chromedriver').path)}`;
  
  before(Promise.coroutine(function*() {
    process.on('beforeExit', () => this.browser && this.browser.quit());
    process.env.PATH = process.env.PATH ? process.env.PATH + chromeDriverPathAddition : chromeDriverPathAddition;
    this.browser = yield new webdriver.Builder()
      .disableEnvironmentOverrides()
      .forBrowser('chrome')
      .setLoggingPrefs(Object.assign({}, {browser: 'ALL'}, outputAllDriverLogs ? {driver: 'ALL'} : {}))
      .build();
  }));

  after(Promise.coroutine(function*() {
    try {
      if (!this.browser)
        return;
      if (outputAllDriverLogs) {
        const driverLogs = yield this.browser.manage().logs().get('driver');
        driverLogs.forEach(l =>
          process.stdout.write(`${l.message}\n`));
      }

      if (expectNoConsoleLogs) {
        const allConsoleLogs = yield this.browser.manage().logs().get('browser');
        const relevantConsoleLogs = allConsoleLogs.filter(l => !l.message.includes('favicon'));

        // I'm outputting this regardless of assert below so that the console logs will be shown nicely in CI
        if (relevantConsoleLogs.length > 0) {
          process.stdout.write(`Bad console logs are: ${JSON.stringify(relevantConsoleLogs, null, 1000)}\n`);
        }

        if (relevantConsoleLogs.length > 0)
          assert(false, `error logs need to be empty, but are ${JSON.stringify(relevantConsoleLogs)}`);
      }
    } finally {
      if (this.browser) {
        yield this.browser.quit();
      }

      process.env.PATH = ((process.env/*: Object*/).PATH/*: string*/).replace(chromeDriverPathAddition, '')
    }    
  }));
};
