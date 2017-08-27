# buildbot-worker-docker-npm
The docker image for NI's buildbot slave for type:docker-npm projects

## What does it include?
* based off of the buildbot-worker-npm
* `docker.io` (well, duh) - we should actually be using only the docker client part of docker, but there is currently
  no package that gives us _just_ the docker client.

## What input does it need
Given that it needs to run `docker commands`, then it means that it needs a host somewhere. There are two alternatives
to this:
* Send it a `DOCKER_HOST` environment variable.
* Map your machines `docker.sock` to this container's `docker.sock`,
  thus `-v /var/run/docker.sock:/var/run/docker.sock` (or the equivalent in docker-compose). This is the method
  used by the tests, and makes this docker use the host docker.

To be able to publish to a registry that is not the docker host's repository, 
send it a `DOCKER_REGISTRY_HOST` environment variable.
