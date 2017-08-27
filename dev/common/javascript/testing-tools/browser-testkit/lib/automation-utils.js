const Promise = require('bluebird');
const webdriver = require('selenium-webdriver');

module.exports = {
  setInputValue: Promise.coroutine(function* (inputElement, value) {
    yield inputElement.click();
    yield inputElement.clear();
    yield inputElement.sendKeys(value);
    yield inputElement.sendKeys(webdriver.Key.ENTER);
  })
};
