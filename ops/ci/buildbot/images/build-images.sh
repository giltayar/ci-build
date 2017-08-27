set -e
echo BUILDING MASTER
pushd buildbot-master-image
npm install
npm run build

docker build . -f Dockerfile -t giltayar/buildbot-master-image
popd

echo BUILDING WORKER NPM
pushd buildbot-worker-npm-image
cd npm-version-incrementor
npm install
npm test
cd ../s3-uploader
npm install
npm test
cd ..
docker build . -f Dockerfile -t giltayar/buildbot-worker-npm-image
popd

echo BUILDING DOCKER NPM
pushd buildbot-worker-docker-npm-image
docker build . -f Dockerfile -t giltayar/buildbot-worker-docker-npm-image
popd

echo BUILDING ARTIFACTSRC NPM
pushd buildbot-worker-artifactsrc-image
cd artifactsrc-yml-generator
npm install
npm test
cd ..
docker build . -f Dockerfile -t giltayar/buildbot-worker-artifactsrc-image
popd