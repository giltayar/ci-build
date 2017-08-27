//@flow
const Promise = require('bluebird');
const {default: retry} = require('retry-promise');
const zipObject = require('lodash/zipObject');
const fetch = require('node-fetch');
const {By,  eventually} = require('browser-testkit');
const assert = require('assert');


exports.forceBuild = Promise.coroutine(function*(browser, artifact) {
  yield showBuilders(browser);
  yield eventually(Promise.coroutine(function*() {
    yield clickOnExactElement(browser, 'a', artifact);

    yield clickOnExactElement(browser, 'button', 'Force');

    yield clickOnExactElement(browser, 'button', 'Start Build');
  }));
});

exports.countArtifactBuilds = Promise.coroutine(function*(browser, artifactNames) {
  const artifactRows = yield findArtifactRows(browser, artifactNames);

  const artifactBuildCounts = yield Promise.all(
    artifactRows.map(r => r.findElements(By.css('td:nth-child(2) .badge-status')).then(badges => badges.length)));
    
  const artifactBuildNames = yield Promise.all(
    artifactRows.map(r => r.findElement(By.css('td:nth-child(1) a')).then(name => name.getText())));

  return zipObject(artifactBuildNames, artifactBuildCounts);
});

exports.determineLastBuildResult = Promise.coroutine(function*(browser, artifactNames) {
  const artifactRows = yield findArtifactRows(browser, artifactNames);

  const artifactBuildStatusElements = yield Promise.all(
    artifactRows.map(artifactRow => artifactRow.findElement(By.css('.badge-status:nth-child(1)'))));
  const artifactBuildStatusClasess = yield Promise.all(
    artifactBuildStatusElements.map(badgeElement => 
    badgeElement.getAttribute('class')));
  const artifactBuildStatuses = artifactBuildStatusClasess.map(c => 
    c.includes('results_SUCCESS') ? 
      true :
      c.includes('results_FAILURE') ? 
      false : null);
  const artifactBuildNames = yield Promise.all(
    artifactRows.map(r => r.findElement(By.css('td:nth-child(1) a')).then(name => name.getText())));

    return zipObject(artifactBuildNames, artifactBuildStatuses);
});

exports.ensureSiteIsReady = Promise.coroutine(function*(url) {
  yield retry({max: 120, backoff: 1000}, Promise.coroutine(function*() {
    const response = yield fetch(url);
    if (!response.ok)
      throw new Error(`Error loading site ${url}: ${response.status}`);

    const html = yield response.text();
    if (!html || html.length < 10)
      throw new Error(`Error loading site ${url}: empty response`);
  }));  
});

const clickOnElement = Promise.coroutine(function*(browser, elementType, partialLinkText) {
  try {
    yield (yield browser.findElement(By.xpath(`//${elementType}[contains(., "${partialLinkText}")]`))).click();
  }
  catch (e) {
    if (e.toString().includes('is not clickable'))
      return false;
    else 
      throw e;
  }

  return true;
});

const clickOnExactElement = Promise.coroutine(function*(browser, elementType, partialLinkText) {
  try {
    yield (yield browser.findElement(By.xpath(`//${elementType}[. = "${partialLinkText}"]`))).click();
  }
  catch (e) {
    if (e.toString().includes('is not clickable'))
      return false;
    else 
      throw e;
  }

  return true;
});

const findArtifactRows = Promise.coroutine(function*(browser, artifactNames) {
  return yield eventually(Promise.coroutine(function*() {
    yield showBuilders(browser);
    
    const rows = yield browser.findElements(By.css('table tr'));

    const artifactRows = yield Promise.all(Promise.filter(rows, 
      row => row.findElements(By.css('td:nth-child(1) a'))
        .then(nameElements => nameElements.length > 0 ? nameElements[0].getText() : '')
        .then(name => artifactNames.includes(name))));

    assert.strictEqual(artifactRows.length, artifactNames.length);

    return artifactRows;
  }));
});

const showBuilders = Promise.coroutine(function*(browser) {
  const clickable = yield clickOnElement(browser, 'a', 'Builders');
  if (!clickable) {
    yield clickOnElement(browser, 'a', 'Builds');
    yield Promise.delay(1000);
    yield clickOnElement(browser, 'a', 'Builders');
  }

  yield eventually(Promise.coroutine(function*() {
    assert.strictEqual(yield (yield browser.findElement(By.css('table tr th:nth-child(2)'))).getText(), 'Builds');
  }));
});