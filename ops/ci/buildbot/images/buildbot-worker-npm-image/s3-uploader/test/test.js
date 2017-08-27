//@flow
'use strict';
const Promise = require('bluebird');
const {describe, it, beforeEach, afterEach} = require('mocha');
const {expect} = require('chai');
const path = require('path');
const dockerComposeTool = require('ni-docker-compose-tool');
const thePackage = require('..');
const s3 = require('s3');
const child_process = require('child_process');

describe('s3-uploader', function() {
  const composeFile = 'test/docker-compose.yml';
  // I'm using forEach so that each test will start with a new and empty s3
  const envName = dockerComposeTool.dockerComposeTool(beforeEach, afterEach, composeFile);
  
  const accessKeyId = 'stam';
  const secretAccessKey = 'secret';
  let s3Endpoint;
  let s3Uploader;
  let s3Client;
  beforeEach(() => 
    dockerComposeTool.getRandomPortForService(envName, composeFile, 's3', 4569)
      .then(authority => s3Endpoint = `http://${authority}/`));
  beforeEach(() => s3Uploader = thePackage(s3Endpoint, accessKeyId, secretAccessKey));
  beforeEach(() => s3Client = 
    s3.createClient({
      s3Options: {
        accessKeyId,
        secretAccessKey,
        endpoint: s3Endpoint,
        s3ForcePathStyle: true
      }
    }));
  beforeEach(() => Promise.all([createBucket(s3Client, 'main'), createBucket(s3Client, 'sane')]));

  describe('uploadDirToBucket', function() {
    it('should upload a dir to a bucket', Promise.coroutine(function*() {
      yield s3Uploader.uploadDirToBucket('main', path.join(__dirname, 'test-package', 'dir1'));

      expect(yield readS3File(s3Client, 'main', 'foo.txt')).to.equal('Yes!');
      expect(yield readS3File(s3Client, 'main', 'subdir/foo.txt')).to.equal('Yazoo!');
    }));
  })

  describe('fetchAssetInformation + uploadAssets', function() {
    it('should upload the assets in the package', Promise.coroutine(function*() {
    const assetsDir = path.join(__dirname, 'test-package');

    const assetInformation = yield s3Uploader.fetchAssetInformation(assetsDir);

    yield s3Uploader.uploadAssets(assetsDir, assetInformation);
    expect(yield readS3File(s3Client, 'main', 'foo.txt')).to.equal('Yes!');
    expect(yield readS3File(s3Client, 'main', 'subdir/foo.txt')).to.equal('Yazoo!');
    expect(yield readS3File(s3Client, 'sane', 'moo.txt')).to.equal('Moo...');
    expect(yield readS3File(s3Client, 'sane', 'cuckoo.txt')).to.equal('Knock knock');
    }));
  });

  describe('upload script', function() {
    it('should upload the assets in the package', Promise.coroutine(function*() {
      const assetsDir = path.join(__dirname, 'test-package');
      
      const [stdout, stderr] = 
        yield Promise.promisify(child_process.exec, {multiArgs: true})('node ../../scripts/upload-assets-to-s3.js', 
          {
            cwd: assetsDir,
            env: {
              S3_ENDPOINT: s3Endpoint.replace('0.0.0.0', 'localhost'),
              S3_ACCESS_KEY_ID: accessKeyId,
              S3_SECRET_ACCESS_KEY: secretAccessKey,
              S3_TRANSLATE_HOST_TO_IP: 'true'
            }
          });
      console.log(stdout);

      expect(yield readS3File(s3Client, 'main', 'foo.txt')).to.equal('Yes!');
      expect(yield readS3File(s3Client, 'main', 'subdir/foo.txt')).to.equal('Yazoo!');
      expect(yield readS3File(s3Client, 'sane', 'moo.txt')).to.equal('Moo...');
      expect(yield readS3File(s3Client, 'sane', 'cuckoo.txt')).to.equal('Knock knock');

      expect(stdout).to.include('assets uploaded');
      expect(stderr).to.be.empty;
    }));
  });
});

const readS3File = function(s3Client, bucket, filename) {
  return new Promise((resolve, reject) => {
    const downloadEvents = s3Client.downloadBuffer({
      Bucket: bucket,
      Key: filename
    });
    downloadEvents.on('error', reject);
    downloadEvents.on('end', (content) => resolve(content.toString()));
  });
};

const createBucket = (s3Client, bucket) =>
  new Promise((resolve, reject) => 
    s3Client.s3.createBucket({
      Bucket: bucket
  }, (err, data) => err ? reject(err) : resolve(data)));