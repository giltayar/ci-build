# s3-uploader
API and scripts to upload assets to s3

## Purpose
 To upload "assets" as defined in Nickelbot's `artifactrc.yml`

## Installation
 ```sh
 npm install --save s3-uploader
```

## Usage
There are two ways to use this package:
* `s3Uploader = require('s3-uploader`)` to use the API.
* Run the script `scripts/upload-assets-to-s3.js`, which uploads the directories defined in `artifactrc.yml`.

### API
Look in `index.js` and figure out the API. This is the same API used by the `upload-assets-to-s3.js` script

### upload-assets-to-s3.js
Looks for the `artifactrc.yml` in the current directory, and uploads whatever is defined there to s3.

Environment variables used:
* `S3_ENDPOINT`: full URL for the endpoint. Can be null/undefined if you want the default AWS endpoint. Mostly used
  by tests.
* `S3_ACCESS_KEY_ID`: the access key id as given by AWS
* `S3_SECRET_ACCESS_KEY`: the secret key as given by AWS
* `S3_TRANSLATE_HOST_TO_IP`: set this env to whatever, will reformat the `S3_ENDPOINT` by replacing the host in 
  that URL to an IP. Why do we need this? 
  Because the `fake-s3` used in the e2e test needs an IP and not a host, because when it is a host
  it tries to interpret as including a bucket name, which is not what we want in the test scenario.
