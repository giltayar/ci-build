from builder_npm import add_npm_build_steps
from ShellStepWithName import ShellStepWithName

def add_docker_npm_build_steps(build_factory, artifact_name, has_assets):
    add_npm_build_steps(build_factory, has_assets)
    add_docker_build_steps(build_factory, artifact_name)

def add_docker_build_steps(build_factory, artifact_name):
    full_artifact_name =\
        "${{DOCKER_REGISTRY_HOST}}giltayar/{}:`jq -r .version package.json`".format(artifact_name)
    build_factory.addStep(
        ShellStepWithName(
            'docker build',
            command='docker build . -t {}'.format(full_artifact_name)))
    build_factory.addStep(
        ShellStepWithName(
            'docker push',
            command='docker push {}'.format(full_artifact_name)))
