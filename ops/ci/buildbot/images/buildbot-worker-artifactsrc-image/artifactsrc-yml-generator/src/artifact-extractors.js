//@flow
'use strict';
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const find = require('lodash/find');
const pathOf = require('./path-of');
const parseAuthor = require('parse-author');

module.exports = (fileFetcher/*:string => Promise<Buffer>*/) => {
  return {
    npmExtractor: Promise.coroutine(function*(filename, basedir) {
      if (path.basename(filename) != 'package.json') {
        return undefined;
      }

      const packageJsonContents = yield fileFetcher(filename);
      try {
        const packageJson = JSON.parse(packageJsonContents);
        return {
          artifact: packageJson.name,
          path: pathOf(filename, basedir),
          type: 'npm',
          dependencies: Object.keys(packageJson.dependencies || {})
            .concat(Object.keys(packageJson.devDependencies || [])),
          owners: (packageJson.contributors || []).map(c => c.email || parseAuthor(c).email).concat(
            packageJson.author ? packageJson.author || parseAuthor(packageJson.author).email : [])
        };
      } catch(e) {
        if (e instanceof SyntaxError) {
          console.error(`package.json ${filename} did not parse`, e);
        }
        throw e;
      }
    }),
    dockerExtractor: Promise.coroutine(function*(filename, basedir) {
      if (path.basename(filename) === 'Dockerfile') {
        return {
          artifact: path.basename(path.dirname(filename)),
          path: pathOf(filename, basedir),
          type: 'docker'
        }
      }
      else {
        return undefined;
      }
    }),
    artifactsRcYmlExtractor: Promise.coroutine(function*(filename, basedir) {
      if (path.basename(filename) !== 'artifactrc.yml' || path.relative(basedir, filename) === 'artifactrc.yml') {
        return undefined;
      }

      const artifactsRcYmlContents = yield fileFetcher(filename);
      try {
        return Object.assign(yaml.safeLoad(artifactsRcYmlContents), {path: pathOf(filename, basedir)});
      } catch(e) {
        if (e instanceof yaml.YAMLExtension) {
          console.error(`artifactrc.yml ${filename} did not parse`, e);
        }
        throw e;
      }  
    }),
    combinedExtractorCreator: function(extractors/*:Array<(string, string) => Promise<?Object>>*/) {
      return function(filename/*:string*/, basedir/*:string*/) {
        return Promise.all(extractors.map(extractor => extractor(filename, basedir)))
          .then(extractorResults => extractorResults.filter(r => !!r))
          .then(extractorResults => extractorResults.length ? extractorResults : undefined)
      };
    },
    extractorMerger: function(artifacts/*: Array<Object>*/) {
      const npmArtifact = find(artifacts, e => e.type === 'npm');
      const dockerArtifact = find(artifacts, e => e.type === 'docker');
      const artifactsRcYmlArtifact = find(artifacts, e => !e.type);

      const npmDependencies = ((npmArtifact || {}).dependencies || []);
      const dockerDependencies = ((dockerArtifact || {}).dependencies || []);
      const artifactsRcYmlDependencies = ((artifactsRcYmlArtifact || {}).dependencies || []);

      const mergedDependencies = {
        dependencies: Array.from( new Set([].concat(npmDependencies, dockerDependencies, artifactsRcYmlDependencies)))
      };

      if (npmArtifact && dockerArtifact) {
        return Object.assign({}, dockerArtifact, npmArtifact, {type: 'docker-npm'}, 
          artifactsRcYmlArtifact, mergedDependencies);
      }
      else if (npmArtifact || dockerArtifact || artifactsRcYmlArtifact) {
        return Object.assign({}, npmArtifact, dockerArtifact, artifactsRcYmlArtifact, mergedDependencies);
      }
      else {
        return undefined;
      }
    }
  }
};
