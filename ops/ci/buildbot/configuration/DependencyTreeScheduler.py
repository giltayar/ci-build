from buildbot import util
from buildbot.schedulers import base
from buildbot.process.properties import Properties
from buildbot.process.results import SUCCESS, WARNINGS
from twisted.internet import defer
from twisted.python import log
from dependency_tree import builds_that_can_be_built, transitive_closure
import dependency_tree

class DependencyTreeScheduler(base.BaseScheduler):
    def __init__(self,
                 name,
                 build_dependency_tree,
                 builds_from_change,
                 change_filter,
                 **kwargs):
        base.BaseScheduler.__init__(self, name, builderNames=build_dependency_tree.keys(),
                                    **kwargs)
        self.change_filter = change_filter
        self.dependency_tree = build_dependency_tree
        self.builds_from_change = builds_from_change
        self._buildset_complete_consumer = None

        self._complete_cb_lock = defer.DeferredLock()

    @defer.inlineCallbacks
    def activate(self):
        yield base.BaseScheduler.activate(self)

        yield self.startConsumingChanges(fileIsImportant=lambda change:
                                         len(self.builds_from_change(change)) > 0,
                                         change_filter=self.change_filter,
                                         onlyImportant=True)

        self._buildset_complete_consumer = yield self.master.mq.startConsuming(
            self._buildset_complete_cb,
            ('buildsets', None, 'complete'))

    @defer.inlineCallbacks
    def deactivate(self):
        # the base deactivate will unsubscribe from new changes
        yield base.BaseScheduler.deactivate(self)

        if self._buildset_complete_consumer:
            self._buildset_complete_consumer.stopConsuming()

    @defer.inlineCallbacks
    def gotChange(self, change, important):
        if '#nobuild' in change.comments:
            print 'ignoring this change because it has #nobuild in the commit message'
            return
        changeid = change.number
        log.msg('got change for change {}'.format(changeid))
        to_build = transitive_closure(self.dependency_tree,
                                      self.builds_from_change(change))
        yield self.setState('to_build-' + str(changeid), dependency_tree.serialize(to_build))

        already_built = set()
        yield self.setState('already_built-' + str(changeid), [])
        builds_to_build_now = builds_that_can_be_built(to_build, already_built)
        if len(builds_to_build_now) == 0:
            return
        log.msg('initially building builds {} in change {}'.format(builds_to_build_now, changeid))
        for build in builds_to_build_now:
            yield self.addBuildsetForChanges(
                reason='because of change',
                changeids=[changeid],
                builderNames=[build],
                properties=Properties.fromDict({
                    'changeid': (changeid, 'Scheduler'),
                    'build': (build, 'Scheduler')}))

    @util.deferredLocked('_complete_cb_lock')
    @defer.inlineCallbacks
    def _buildset_complete_cb(self, key, msg):
        bsid = msg['bsid']
        changeid, build_name, is_complete, result = yield self._get_build_info(bsid)
        if changeid is None:
            # Not a build that was created by DependencyTreeScheduler
            return
        if not is_complete:
            log.msg('strange - got a noncomlete build for {}'.format(build_name))
            return
        already_built = set((yield self.getState('already_built-' + str(changeid), [])))
        if build_name in already_built:
            log.msg('strange - got the same build twice {} for change {}'.
                    format(bsid, changeid))
            return

        to_build = dependency_tree.deserialize((yield self.getState('to_build-' + str(changeid))))

        already_built.add(build_name)
        if result not in (SUCCESS, WARNINGS):
            builds_to_skip_due_to_error = transitive_closure(to_build, set([build_name])).keys()
            log.msg('change #{}, build {} failed. Killing future builds of {}'
                    .format(changeid, build_name, builds_to_skip_due_to_error))
            already_built.update(set(builds_to_skip_due_to_error))
            yield self.setState('already_built-' + str(changeid), list(already_built))
            return

        yield self.setState('already_built-' + str(changeid), list(already_built))

        yet_to_be_built = to_build.copy()
        for build in already_built:
            yet_to_be_built.pop(build, None)
        builds_to_build_now = builds_that_can_be_built(yet_to_be_built, already_built)
        log.msg('change #{}, build {} completed. need to build {}, but will build only {}'
                .format(changeid, build_name, yet_to_be_built.keys(), builds_to_build_now))
        if len(builds_to_build_now) > 0:
            for build in builds_to_build_now:
                log.msg('change #{}, build {} completed. Creating build for {}'
                        .format(changeid, build_name, build))
                yield self.addBuildsetForChanges(
                    reason='because {} completed'.format(build_name),
                    changeids=[changeid],
                    builderNames=[build],
                    properties=Properties.fromDict({
                        'changeid': (changeid, 'Scheduler'),
                        'build': (build, 'Scheduler')}))
            already_built.add(build)
            yield self.setState('already_built-' + str(changeid), list(already_built))
        else:
            log.msg('Woohoo! Finished change {}'.format(changeid))

    @defer.inlineCallbacks
    def _get_build_info(self, bsid):
        buildset_props = yield self.master.data.get(
            ('buildsets', str(bsid), 'properties'))
        buildset_data = yield self.master.data.get(
            ('buildsets', str(bsid)), fields=['complete', 'results'])

        defer.returnValue((buildset_props.get('changeid', [None])[0],
                           buildset_props.get('build', [None])[0],
                           buildset_data['complete'], buildset_data['results']))
