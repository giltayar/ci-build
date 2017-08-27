import os
import signal
from buildbot.plugins import steps, util
from buildbot.process import buildstep
from ShellStepWithName import ShellStepWithName

def add_artifactsrc_yml_build_steps(build_factory, repo):
    build_factory.addStep(steps.Git(
        repourl=repo,
        mode='incremental'))
    build_factory.addStep(ShellStepWithName(
        'generate artifacts.yml',
        command='if [ -e /tmp/artifacts.yml ]; then rm -f /tmp/artifactsrc.yml; fi'
        + ' && node /home/buildbot/artifactsrc-yml-generator artifactsrc.yml /tmp/artifactsrc.yml'))
    build_factory.addStep(ShellStepWithName(
        'copy artifactsrc.yml',
        command='cp /tmp/artifactsrc.yml artifactsrc.yml'
    ))
    build_factory.addStep(ShellStepWithName(
        'commit changed artifactsrc.yml',
        command='git commit -am "Dependencies changed" || echo Dependencies not changed'
    ))
    build_factory.addStep(ShellStepWithName(
        'push changed artifactsrc.yml',
        command='git pull && git push'
    ))
    build_factory.addStep(ReconfigMaster())

class ReconfigMaster(buildstep.ShellMixin, steps.BuildStep):
    def __init__(self, **kwargs):
        kwargs = self.setupShellMixin(kwargs)
        steps.BuildStep.__init__(self, **kwargs)
        self.name = 'reconfig master'

    def run(self):
        os.kill(os.getpid(), signal.SIGHUP)
        return util.SUCCESS
