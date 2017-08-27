echo configuring registry ${NPM_REGISTRY}
npm config set registry ${NPM_REGISTRY}

echo logging in ${NPM_USER}
expect -d /home/buildbot/login-expect.sh $NPM_USER $NPM_PASSWORD 

cat ~/.npmrc
