#!/usr/bin/env node
'use strict';
//@flow
const Promise = require('bluebird');
const uploadToS3 = require('..');
const packageDir = process.cwd();
const url = require('url');
const dns = require('dns');

const translateHostToIpInUrl = (aUrl) => {
  const urlObject = url.parse(aUrl);
  
  return Promise.promisify(dns.lookup, {multiArgs: true})(urlObject.hostname || '')
    .then(([address]) => {
      urlObject.hostname = address;
      urlObject.host = undefined;

      return url.format(urlObject)
    });
};

const endpointPromise = process.env.S3_TRANSLATE_HOST_TO_IP ?
    translateHostToIpInUrl(process.env.S3_ENDPOINT) :
    Promise.resolve(process.env.S3_ENDPOINT);

endpointPromise.then(endpoint => {
  const s3Uploader = uploadToS3(
    endpoint, 
    process.env.S3_ACCESS_KEY_ID || '', 
    process.env.S3_SECRET_ACCESS_KEY || '');

  s3Uploader.fetchAssetInformation(packageDir)
  .then(assetsInfo =>
    s3Uploader.uploadAssets(packageDir, assetsInfo))
  .then(() => console.log('assets uploaded'))
  .catch((err) => {
    console.error('failed to upload assets', err, err.stack);
    process.exit(1);
  });
});
