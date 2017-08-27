//@flow
const prepareBrowser = require('./lib/prepare-browser');
const {setInputValue} = require('./lib/automation-utils')
const eventually = require('./lib/eventually');
const webdriver = require('selenium-webdriver');

module.exports = {
  prepareBrowser,
  webdriver,
  By: webdriver.By,
  eventually,
  setInputValue
};