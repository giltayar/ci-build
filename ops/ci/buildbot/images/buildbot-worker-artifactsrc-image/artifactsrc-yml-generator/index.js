'use strict';
//@flow
const Promise = require('bluebird');
const {artifactWalker, fetchEntriesOfDir} = require('./src/artifact-walker');
const artifactExtractorsCreator = require('./src/artifact-extractors');
const artifactDependenciesFilter = require('./src/artifact-dependency-filter');
const path = require('path');
const fs = require('fs');
Promise.promisifyAll(fs);
const yaml = require('js-yaml');


module.exports = function(inputFilename/*:string*/, outputFilename/*:string*/) {
  //$FlowFixMe
  const fileFetcher = filename => fs.readFileAsync(filename);
  const extractors = artifactExtractorsCreator(fileFetcher);

  return artifactWalker(fetchEntriesOfDir, path.dirname(inputFilename), 
    extractors.combinedExtractorCreator([
      extractors.npmExtractor,
      extractors.dockerExtractor,
      extractors.artifactsRcYmlExtractor
    ]), extractors.extractorMerger)
  .then(artifacts => {
    const filteredDependenciesArtifacts = artifactDependenciesFilter(artifacts);

    fs.writeFileSync(outputFilename, yaml.safeDump(filteredDependenciesArtifacts))
  });
}

//$FlowFixMe
if (require.main === module) {
  const inputFilename = path.resolve(process.argv[2]);
  const outputFilename = process.argv[3];
  console.log(`Generating ${inputFilename} => ${outputFilename}...`)
  module.exports(inputFilename, outputFilename)
    .then(() => console.log('artifactsrc.yml generated'))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
