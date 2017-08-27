'use strict';
//@flow
const Promise = require('bluebird');
const fs = require('fs');
Promise.promisifyAll(fs);
const path = require('path');
const {executeAndEnsureCommandSucceeded} = require('./execute-command');
const mapValues = require('lodash/mapValues');

exports.artifactNames = ['a', 'b', 'c', 'd', 'e', 'f'];

exports.cloneAndResetTestArtifacts = Promise.coroutine(function*(gitUrl, packageVersions, dependenciesVersions) {
  // $FlowFixMe
  const gitDir = yield fs.mkdtempAsync('/tmp/');

  console.log(`cloning ${gitUrl} into ${gitDir}`);
  yield executeAndEnsureCommandSucceeded(`git clone --depth=1 ${gitUrl} ${gitDir}`, {cwd: gitDir});

  yield executeAndEnsureCommandSucceeded(`cp -R ${path.join(__dirname, '../test-artifacts')}/ ${gitDir}`);

  for (const artifact of exports.artifactNames) {
    const packageDir = path.join(gitDir, `${artifact}`);

    yield exports.setVersionOfPackage(gitDir, artifact, packageVersions);
    yield setDependenciesVersions(gitDir, artifact, dependenciesVersions);
  }

  yield executeAndEnsureCommandSucceeded(`git add .`, {cwd: gitDir});
  yield executeAndEnsureCommandSucceeded(`git commit -am 'resetting artifacts to 1.0 #nobuild'`, {cwd: gitDir});  
  yield executeAndEnsureCommandSucceeded(`git push`, {cwd: gitDir});  

  console.log('git repo is ready');

  return gitDir;
});

exports.setVersionOfPackage = Promise.coroutine(function*(gitDir, thePackage, version) {
  const packageJson = yield readPackageJson(gitDir, thePackage);

  yield writePackageJson(gitDir, thePackage, Object.assign({}, packageJson, {version})); 
});

exports.changePackageVersion = Promise.coroutine(function*(gitDir, thePackage, targetVersion) {
  const packageJson = yield readPackageJson(gitDir, thePackage);

  const newPackageJson = Object.assign({}, packageJson, {version: targetVersion});
  
  yield writePackageJson(gitDir, thePackage, newPackageJson); 
});

exports.changePackageVersionDependencies = Promise.coroutine(function*(gitDir, thePackage, dependency, targetVersion) {
  const packageJson = yield readPackageJson(gitDir, thePackage);

  const newPackageJson = Object.assign({}, packageJson, {
    dependencies: Object.assign({}, packageJson.dependencies, {[dependency]: targetVersion})
  });
  
  yield writePackageJson(gitDir, thePackage, newPackageJson); 
}); 

exports.incrementMinorVersion = Promise.coroutine(function*(gitDir, thePackage) {
  const packageJson = yield readPackageJson(gitDir, thePackage);

  const versionFields = packageJson.version.split('.');
  const newVersionFields = [versionFields[0], parseInt(versionFields[1]) + 1, versionFields[2]];
  const newVersion = newVersionFields.join('.'); 

  const newPackageJson = Object.assign({}, packageJson, {version: newVersion});
  
  yield writePackageJson(gitDir, thePackage, newPackageJson); 
});

exports.addArtifact = Promise.coroutine(function*(gitDir, dir, files) {
  const newPackagePath = path.join(gitDir, dir);
  //$FlowFixMe
  yield fs.mkdirAsync(newPackagePath);

  yield Promise.all(Object.entries((files)).map(
    //$FlowFixMe
    ([name, content]) => fs.writeFileAsync(path.join(newPackagePath, name), content)));

  yield executeAndEnsureCommandSucceeded(`git add .`, {cwd: newPackagePath});
});

exports.gitCommitAndPush = Promise.coroutine(function*(gitDir, commitMessage) {
  yield executeAndEnsureCommandSucceeded(`git commit -am '${commitMessage}'`, {cwd: gitDir});  
  yield executeAndEnsureCommandSucceeded(`git pull --rebase`, {cwd: gitDir});  
  yield executeAndEnsureCommandSucceeded(`git push`, {cwd: gitDir});  
});

const setDependenciesVersions = Promise.coroutine(function*(gitDir, thePackage, targetVersion) {
  const packageJson = yield readPackageJson(gitDir, thePackage);
  
  yield writePackageJson(gitDir, thePackage, Object.assign({}, packageJson, {
    dependencies: replaceDependencies(packageJson.dependencies)
  }));

  function replaceDependencies(dependencies) {
    return mapValues(dependencies || {}, 
      (version, artifact) => exports.artifactNames.includes(artifact) ? targetVersion : version); 
  } 
});

const readPackageJson = (gitDir, thePackage) => 
  // $FlowFixMe
  fs.readFileAsync(path.join(gitDir, thePackage, 'package.json')).then(JSON.parse);

const writePackageJson = (gitDir, thePackage, thePackageJson) => 
  // $FlowFixMe
  fs.writeFileAsync(path.join(gitDir, thePackage, 'package.json'), JSON.stringify(thePackageJson, null, 2))  