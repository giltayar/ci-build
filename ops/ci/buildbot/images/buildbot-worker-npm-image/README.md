# buildbot-worker-npm
The docker image for buildbot slave for type:npm projects

## What does it include?
* based off of the official buildbot-worker
* `node` (well, duh)
* `jq` (because it is used by npm steps to skip tests if the specific script does not exist)
* `expect` - to enable automated `npm login` (see Dockerfile to see how we do `npm login` before running buildbot worker)
* `s3-uploader`: to upload the assets to s3. *This package should be separate from this image, but since
  I don't have push-authorization to the Nexus, I built it inside (UGLY HACK!)*
* `npm-version-incrementor`: increments the patch version of the local `package.json` so that it can be
  `npm-publish`-ed. *This package should be separate from this image, but since
  I don't have push-authorization to the Nexus, I built it inside (UGLY HACK!)*

## What input does it need
* Environment variables:
  * `NPM_REGISTRY`, `NPM_USER`, `NPM_PASSWORD`: which registry to use for `npm install` and `npm publish`.
  * `NPM_CONFIG_LOCATION`: It copies the `.npmrc` from there to the `~` location to be used by npm. The idea is to use
    volume mapping to bring your `.npmrc` to inside the container. *I am not sure this is needed anymore given
    that we do `npm login` now.*
