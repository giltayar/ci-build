'use strict';
//@flow
const Promise = require('bluebird');
const fs = require('fs');
const flatten = require('lodash/flatten');
const find = require('lodash/find');
Promise.promisifyAll(fs);
const path = require('path');
const pathOf = require('./path-of');

exports.artifactWalker = Promise.coroutine(
  function*(fetchEntriesOfDir, dir, extractArtifacts, extractorMerger, baseDir=dir) {
    const entries = yield fetchEntriesOfDir(dir);
    const filenames = entries
      .filter(entry => entry.type === 'file')
      .map(entry => path.join(dir, entry.name));

    const artifactsOfFiles = yield Promise.all(filenames
      .map(filename => extractArtifacts(filename, baseDir)));

    const aFileIsAnArtifactLeaf = d => !!d;
    
    if (find(artifactsOfFiles, aFileIsAnArtifactLeaf)) {
      console.log(`found artifact in ./${pathOf(filenames[0], baseDir)}`);

      return extractorMerger(flatten(artifactsOfFiles).filter(a => !!a));
    }
    
    const artifacts = yield Promise.all(entries
      .filter(entry => entry.type === 'dir')
      .map(entry => 
        exports.artifactWalker(fetchEntriesOfDir, 
          path.join(dir, entry.name), extractArtifacts, extractorMerger, baseDir)));

    return flatten(artifacts).filter(a => !!a);
});

exports.fetchEntriesOfDir = Promise.coroutine(function*(dir) {
  // $FlowFixMe
  const entryNames = yield fs.readdirAsync(dir);

  return yield Promise.all(entryNames.map(Promise.coroutine(function*(name) {
    const fullName = path.join(dir, name);
    // $FlowFixMe
    const stat = yield fs.statAsync(fullName);
    return {name, type: stat.isDirectory() ? 'dir' : 'file'};
  })));
});
