from buildbot.plugins import util
from MonorepoGitStep import MonorepoGitStep
from builder_npm import add_npm_build_steps
from builder_docker_npm import add_docker_npm_build_steps
from build_artifactsrc_yml import add_artifactsrc_yml_build_steps

def create_builders(repos_and_packages):
    ret = []
    for repo in repos_and_packages:
        for artifact in repo['artifacts']:
            print 'building builder for artifact', artifact['artifact']
            build_factory = util.BuildFactory()
            build_factory.addStep(MonorepoGitStep(
                artifact['path'],
                repourl=repo['repo'],
                mode='full', method='copy'))

            has_assets = artifact.get('assets', None) != None

            if artifact['type'] == 'npm':
                add_npm_build_steps(build_factory, has_assets)
                ret.append(
                    util.BuilderConfig(name=artifact['artifact'],
                                       workernames=["build-npm"],
                                       factory=build_factory,
                                       properties={
                                           'owners': artifact.get('owners', [])
                                       }))
            elif artifact['type'] == 'docker-npm':
                add_docker_npm_build_steps(build_factory, artifact['artifact'], has_assets)
                ret.append(
                    util.BuilderConfig(name=artifact['artifact'],
                                       workernames=["build-docker-npm"],
                                       factory=build_factory,
                                       properties={
                                           'owners': artifact.get('owners', [])
                                       }))

        artifactsrc_yml_build_factory = util.BuildFactory()
        add_artifactsrc_yml_build_steps(artifactsrc_yml_build_factory, repo['repo'])
        ret.append(
            util.BuilderConfig(name='build-artifactsrc-yml',
                               workernames=["build-artifactsrc-yml"],
                               factory=artifactsrc_yml_build_factory))
    return ret
