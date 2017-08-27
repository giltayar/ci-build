//@flow
'use strict';
const {before, after, it, describe} = require('mocha');
const {expect} = require('chai');
const {prepareBrowser, eventually, By} = require('browser-testkit');
const path = require('path');
const Promise = require('bluebird');
const ui = require('./test-utils/buildbot-ui');
const artifacts = require('./test-utils/test-artifacts');
const {executeAndEnsureCommandSucceeded} = require('./test-utils/execute-command');
const {dockerComposeTool, getAddressForService} = require('ni-docker-compose-tool');
const mapValues = require('lodash/mapValues');
const fs = require('fs');
Promise.promisifyAll(fs);
const s3 = require('s3');

describe('buildbot ci', function() {
  const artifactNames = artifacts.artifactNames;
  const longEventually = {timeout: 120000, delay: 1000};
  let s3Client;
  let gitDir;
  let gitServerConfigurationDir;
  let gitServerAddress;
  let dockerEnvName;
  let testArtifactsGitUrl;
  let buildbotUiUrl;
  const dockerComposeFilename = path.join(__dirname, 'docker-compose.yml');

  const prepareGitServer = () => {
      gitServerConfigurationDir = fs.mkdtempSync('/tmp/');
      
      before(() => executeAndEnsureCommandSucceeded(
        `cp -R ${path.join(__dirname, 'git-server-configuration')}/ ${gitServerConfigurationDir}`));

      dockerEnvName = dockerComposeTool(before, after, dockerComposeFilename, {
        startOnlyTheseServices: ['git-server'],
        envVars: {
          GIT_SERVER_CONFIG_DIR: gitServerConfigurationDir
        }
      }).toString();

      before(() =>
        getAddressForService(dockerEnvName, dockerComposeFilename, 'git-server', 3000)
        .then(gitServerAddress => 
          testArtifactsGitUrl = `http://git:git@${gitServerAddress}/git/test-artifacts.git`)
        .then(() => 
          ui.ensureSiteIsReady(testArtifactsGitUrl))
        .then(() => console.log('git server is ready')));
  }

  const prepareRestOfBuildbotServices = () => {
      dockerComposeTool(before, after, dockerComposeFilename, { 
        envName: dockerEnvName,
        envVars: {
          GIT_SERVER_CONFIG_DIR: gitServerConfigurationDir
        }
      });

      before(() => 
        getAddressForService(dockerEnvName, dockerComposeFilename, 'buildbot', 8080)
        .then(buildbotUiAddress => {
          buildbotUiUrl = `http://${buildbotUiAddress}`;

          return ui.ensureSiteIsReady(buildbotUiUrl);
        })
        .then(() => console.log('buildbot is ready')));
  }

  prepareGitServer();
  before(function() {
    return artifacts.cloneAndResetTestArtifacts(testArtifactsGitUrl, '1.0.0', '^1.0.0')
      .then(gd => gitDir = gd);
  });
  prepareRestOfBuildbotServices();
  before(() =>
    getAddressForService(dockerEnvName, dockerComposeFilename, 's3', 4569)
    .then(s3Address => s3Client = s3.createClient({
      s3Options: {
        accessKeyId: "stam",
        secretAccessKey: "secret",
        endpoint: `http://${s3Address}/`,
        s3ForcePathStyle: true
      }
  })), "creating s3 client");
  before(() => createBucket(s3Client, 'main'), "creating bucket");
  prepareBrowser(before, after, {expectNoConsoleLogs: false}, "preparing browser");

  it('force build', Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield ui.forceBuild(browser, 'a');
    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);

      expect(newCount['a']).to.equal(count['a'] + 1);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults['a']).to.equal(true);
    }));
  }));
  
  it('test npm package and asset pushing', Promise.coroutine(function*() {
    const artifactNames = ['npm'];
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield ui.forceBuild(browser, 'npm');    
    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);

      expect(newCount['npm']).to.equal(count['npm'] + 1);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults['npm']).to.equal(true);
    }));

    yield checkS3FileExists(s3Client, 'main', 'npm/build.txt', 'build')
    yield checkS3FileExists(s3Client, 'main', 'npm/test.txt', 'test')
    yield checkS3FileExists(s3Client, 'main', 'npm/make-assets.txt', 'make-assets')
  }));
  
  it('test docker-npm package and asset pushing', Promise.coroutine(function*() {
    const artifactNames = ['docker-npm'];
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield ui.forceBuild(browser, 'docker-npm');    
    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);

      expect(newCount['docker-npm']).to.equal(count['docker-npm'] + 1);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults['docker-npm']).to.equal(true);
    }));

    yield checkS3FileExists(s3Client, 'main', 'docker-npm/build.txt', 'build')
    yield checkS3FileExists(s3Client, 'main', 'docker-npm/test.txt', 'test')
    yield checkS3FileExists(s3Client, 'main', 'docker-npm/make-assets.txt', 'make-assets')
  }));

  it('adding a package changes artifactsrc.yml correctly', Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    yield artifacts.addArtifact(gitDir, 'foo', {
      'package.json': JSON.stringify({name: 'foo', version: '1.0.0'})
    });
    yield artifacts.gitCommitAndPush(gitDir, 'add package foo');

    yield eventually(Promise.coroutine(function*() {
      const artifactNamesWithFoo = artifactNames.concat('foo');

      const count = yield ui.countArtifactBuilds(browser, artifactNamesWithFoo);

      expect(Object.keys(count)).to.have.length(artifactNamesWithFoo.length);      
    }));
  }))

  it('builds for a package are run according to dependencies', Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield artifacts.incrementMinorVersion(gitDir, 'a');
    yield artifacts.gitCommitAndPush(gitDir, 'increment a minor version');
    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);
      const countIncremented = mapValues(count, x => x + 1);

      expect(newCount).to.deep.equal(countIncremented);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults).to.deep.equal({a: true, b: true, c: true, d: true, e: true, f: true});
    }), longEventually);
  }))

  it('builds for a package are run according to dependencies, where not everything is run', 
    Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield artifacts.incrementMinorVersion(gitDir, 'c');
    yield artifacts.gitCommitAndPush(gitDir, 'increment c minor version');
    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);
      const countPartiallyIncremented = Object.assign({}, count, 
        {c: count.c + 1, d: count.d + 1, e: count.e + 1, f: count.f + 1});

      expect(newCount).to.deep.equal(countPartiallyIncremented);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults).to.deep.equal({a: true, b: true, c: true, d: true, e: true, f: true});
    }), longEventually);
  }))

  it('builds are run in dependency order', Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield artifacts.changePackageVersion(gitDir, 'a', '2.0.0');
    yield artifacts.changePackageVersion(gitDir, 'c', '2.0.0');
    yield artifacts.changePackageVersion(gitDir, 'e', '2.0.0');
    yield artifacts.changePackageVersionDependencies(gitDir, 'b', 'a', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'c', 'a', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'd', 'c', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'd', 'c', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'f', 'a', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'f', 'c', '^2.0.0')
    yield artifacts.changePackageVersionDependencies(gitDir, 'f', 'e', '^2.0.0')

    yield artifacts.gitCommitAndPush(gitDir, 'incremment all package major version');

    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);
      const countIncremented = mapValues(count, x => x + 1);

      expect(newCount).to.deep.equal(countIncremented);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults).to.deep.equal({a: true, b: true, c: true, d: true, e: true, f: true});
    }), longEventually);
  }));

  it('failure of a build cascades to dependencies', Promise.coroutine(function*() {
    const {browser} = this;

    yield browser.get(buildbotUiUrl);

    const count = yield ui.countArtifactBuilds(browser, artifactNames);

    yield artifacts.incrementMinorVersion(gitDir, 'a');
    yield artifacts.changePackageVersionDependencies(gitDir, 'c', 'a', '^10.0.0')
    yield artifacts.gitCommitAndPush(gitDir, 'make c fail by depending on a non-existent a version');

    yield eventually(Promise.coroutine(function*() {
      const newCount = yield ui.countArtifactBuilds(browser, artifactNames);
      const countPartiallyIncremented = Object.assign({}, count, 
        {a: count.a + 1, b: count.b + 1, c: count.c + 1});

      expect(newCount).to.deep.equal(countPartiallyIncremented);
      const lastBuildResults = yield ui.determineLastBuildResult(browser, artifactNames);
      expect(lastBuildResults).to.deep.equal({a: true, b: true, c: false, d: true, e: true, f: true});
    }), longEventually);
    
  }))
});

const checkS3FileExists = Promise.coroutine(function*(s3Client, bucket, filename, expectedContent) {
  const content = yield new Promise((resolve, reject) => {
    const downloadEvents = s3Client.downloadBuffer({
      Bucket: bucket,
      Key: filename
    });
    downloadEvents.on('error', reject);
    downloadEvents.on('end', resolve);
  })
  expect(content.toString().trim()).to.equal(expectedContent);
});


const createBucket = (s3Client, bucket) =>
  new Promise((resolve, reject) => 
    s3Client.s3.createBucket({
      Bucket: bucket
  }, (err, data) => err ? reject(err) : resolve(data)));