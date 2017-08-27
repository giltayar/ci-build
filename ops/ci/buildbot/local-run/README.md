# Locally running buildbot with the NI configuration
This package is used to run buildbot with the NI configuration on your machine

## Requirements
* Docker
* Docker Compose (should be part of docker)

## How to run
Use the npm scripts in `package.json`:
* `npm run build`: builds the images, including the python configurations and the npm packages inside the images. 
  It's a shortcut that means you don't need to cd to the image and python folders.
* `npm start`: starts the docker containers (using docker-compose). To access the UI, use `http://localhost:8080`.
* `npm run logs`: shows all the docker logs (rolling). Best used with start, thus: `npm start && npm run logs`.
* `npm run reconfig`: builds everything, and then restarts the buildbot master so that it runs the new
  python configuration. Used extensively to fix something and then check if it works
* `npm run stop`: stops all the docker containers.

## How does it work?
Pretty simply - runs the following containers using Docker Compose:

* `buildbot` - buildbot master. The configuration is gotten via http, and served by `configuration-server` 
  (see below). To access Github, it needs the SSH keys, so it shadows your `~/.ssh`.
* `worker-npm` - The slave used to build type:npm artifacts. It also shadows the `~/.ssh`, 
  as well as your whole `~`, to get at your `.npmrc`. 
* `worker-docker-npm` - The slave used to build type:docker-npm artifacts. It also shadows the `~/.ssh`, 
  as well as your whole `~`, to get at your `.npmrc`. 
* `worker-artifactsrc-` - The slave used to build the `artifactsrc.yml`. It also shadows the `~/.ssh`.
* `db` - postgres used by master to store everything
* `mongo-db-test` - used by the slave, because NI npm packages assume mongo is running.
* `npm-registry` - the NPM registry that is used for `npm install` and `npm publish`. You can access its UI 
  to check that the publishes happened.
* `docker-registry` - the docker repository that is used for `docker push`. You can access its UI 
  to check that the publishes happened.

### worker runs as root. Why?
In the `docker-compose.yml`, you can see that the worker runs as user root. Why? Because otherwiser the `docker build` won't work:
To run `docker build` (and `docker push`), I use the host's docker as the real docker by mapping `/var/run/docker.socket` from the host to the 
worker container. But that is not enough. Since the access to the docker host's is available only to the root user, we have to run the docker
container also as the root user.

This will *not* happen in production! In production we will have a docker host dedicated to running docker builds and containers. It will
be acccessible via https, and that is what will be sent as the DOCKER_HOST to the worker, which will then not need to run as root. 
