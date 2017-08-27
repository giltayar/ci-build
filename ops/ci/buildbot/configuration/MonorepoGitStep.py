from buildbot.plugins import steps
from buildbot.process import buildstep
from twisted.internet import defer
from os import path

RC_SUCCESS = 0

class MonorepoGitStep(steps.Git):
    name = 'monorepo-git'
    renderables = ["repourl", "reference", "branch", "artifact_path",
                   "codebase", "mode", "method", "origin"]

    def __init__(self, artifact_path, **kwargs):
        steps.Git.__init__(self, **kwargs)
        self.artifact_path = artifact_path

    @defer.inlineCallbacks
    def copy(self):
        yield self.runRmdir(self.workdir, abandonOnFailure=False,
                            timeout=self.timeout)

        old_workdir = self.workdir
        self.workdir = self.srcdir

        try:
            yield self.mode_incremental()
            cmd = buildstep.RemoteCommand('cpdir',
                                          {'fromdir': path.join(self.srcdir, self.artifact_path),
                                           'todir': old_workdir,
                                           'logEnviron': self.logEnviron,
                                           'timeout': self.timeout, })
            cmd.useLog(self.stdio_log, False)
            yield self.runCommand(cmd)
            if cmd.didFail():
                raise buildstep.BuildStepFailed()
            defer.returnValue(RC_SUCCESS)
        finally:
            self.workdir = old_workdir

    @defer.inlineCallbacks
    def parseGotRevision(self, _=None):
        try:
            old_workdir = self.workdir
            self.workdir = self.srcdir

            yield steps.Git.parseGotRevision(self)
        finally:
            self.workdir = old_workdir
