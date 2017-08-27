FROM buildbot/buildbot-master:master

RUN apk update && \
    apk upgrade && \
    apk add git bash bash-completion openssh-client && \
    pip install pyyaml toposort

COPY dist/master.tar.gz .

RUN tar -xzf master.tar.gz && \
    rm master.tar.gz
