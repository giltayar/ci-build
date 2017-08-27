from buildbot.plugins import steps

class ShellStepWithName(steps.ShellCommand):
    def __init__(self, name, **kwargs):
        steps.ShellCommand.__init__(self, **kwargs)
        self.name = name
    