FROM giltayar/buildbot-worker-npm-image:latest

USER root

RUN apt-get update \
    && apt-get install -y docker.io

USER buildbot
