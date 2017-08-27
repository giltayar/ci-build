FROM buildbot/buildbot-worker:master

USER root

RUN curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
    apt-get install nodejs && \
    apt-get install -y jq &&  \
    apt-get install -y expect

ENV NODE_ENV=test

COPY npm-version-incrementor/package.json /home/buildbot/npm-version-incrementor/
RUN cd /home/buildbot/npm-version-incrementor/ && npm install --production
COPY npm-version-incrementor /home/buildbot/npm-version-incrementor/

COPY s3-uploader/package.json /home/buildbot/s3-uploader/
RUN cd /home/buildbot/s3-uploader/ && npm install --production
COPY s3-uploader /home/buildbot/s3-uploader/

COPY login-expect.sh login-npm-registry.sh /home/buildbot/

USER buildbot

CMD if [ ! -z "${NPM_CONFIG_LOCATION}" ]; then cp ${NPM_CONFIG_LOCATION} ~/.npmrc; fi \
    && /home/buildbot/login-npm-registry.sh \
    && exec /usr/local/bin/dumb-init twistd -ny buildbot.tac
