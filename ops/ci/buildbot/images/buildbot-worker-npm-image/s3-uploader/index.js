//@flow
'use strict';
const Promise = require('bluebird');
const fs = require('fs');
Promise.promisifyAll(fs);
const path = require('path');
const yaml = require('js-yaml');
const s3 = require('s3');

module.exports = (s3Endpoint/*:?string*/, s3AccessKeyId/*:string*/, s3SecretAccessKey/*:string*/) => {
  const s3Client = 
    s3.createClient({
      s3Options: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
        endpoint: s3Endpoint,
        s3ForcePathStyle: true  
      }
    });

  const fetchAssetInformation = (baseDir/*:string*/) =>
    //$FlowFixMe
    fs.readFileAsync(path.join(baseDir, 'artifactrc.yml'), {encoding: 'utf-8'})
      .then(content => 
        yaml.safeLoad(content).assets)
      .catch(err => err.code === 'ENOENT' ? undefined : Promise.reject(err));

  const uploadAssets = (baseDir/*:string*/, assetInformation/*: {[bucket:string]: string[]} */) =>
    Promise.all(
      Object.entries(assetInformation)
      //$FlowFixMe
      .map(([bucket, dirs]) => [bucket, dirs.map(dir => path.join(baseDir, dir))])
      .map(([bucket, dirs]) => uploadToBucket(bucket, dirs)));

  const uploadToBucket = (bucket/*:string*/, dirs/*:string[]*/) => 
    Promise.all(dirs.map(dir => uploadDirToBucket(bucket, dir)))

  const uploadDirToBucket = (bucket/*:string*/, dir/*:string*/) =>
    new Promise((resolve, reject) => {
      console.log(`uploading ${dir} to ${bucket}... on ${s3Endpoint || 'amazon'}`);
      const uploader = s3Client.uploadDir({
        localDir: dir,
        deleteRemoved: false,
        s3Params: {
          Bucket: bucket
        }
      });

    uploader.on('error', reject);
    uploader.on('end', resolve);
  });

  return {
    fetchAssetInformation,
    uploadAssets,
    uploadToBucket,
    uploadDirToBucket
  };
};
