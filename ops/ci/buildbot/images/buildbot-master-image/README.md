# buildbot-master
The docker image for buildbot master

## What does it include?
* based off of the official buildbot-master
* `master.tag.gz` from `configuration`: it has it because it has a dependency on that package, and the
  `build` script of this copies it from `node_modules`
* bash and bash-completion (for troubleshooting)
* git (because it needs to checkout stuff)
* openssh (because it needs to authenticate git repos)
* pyyaml python library (because it is used by our configuration code in `../configuration`)
* toposort python library (because it is used by our configuration code in `../configuration`)

## What input does it need?
* `git` commands need to access the git repositories needed. The best way is to include the SSH keys for the git
  repos. To do this, just map the ssh keys directory to the internal container's `~/.ssh`. To do this with
  your own keys, use `-v ~/.ssh:/root/.ssh:ro`. This is what happens in the tests.

