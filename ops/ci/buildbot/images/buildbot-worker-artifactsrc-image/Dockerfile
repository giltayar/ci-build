FROM buildbot/buildbot-worker:master

USER root

RUN curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
    apt-get install nodejs

USER buildbot

RUN  git config --global user.name "BuildBot" && \ 
     git config --global user.email "buildbot@naturalint.com" && \
     git config --global push.default simple

ENV NODE_ENV=test

COPY artifactsrc-yml-generator/package.json /home/buildbot/artifactsrc-yml-generator/
RUN npm install --production
COPY artifactsrc-yml-generator /home/buildbot/artifactsrc-yml-generator/
