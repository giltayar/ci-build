import unittest
import json
import git
import repo_artifact_list
import build_config
from dependency_tree import transitive_closure, builds_that_can_be_built, \
                                     serialize, deserialize
import yaml

class Change(object):
    def __init__(self, files):
        self.files = files

class TestBuildConfig(unittest.TestCase):
    def test_that_it_doesnt_bomb(self):
        c = build_config.build_config([{
            'repo': 'https://a-repo',
            'artifacts': yaml.load('''
- artifact: a
  path: a 
  type: npm
  owners:
    - gil.tayar@naturalint.com
- artifact: b
  path: b
  type: docker
- artifact: c
  path: c
  type: npm
  dependencies:
    - a
    - b
- artifact: d
  path: d
  type: npm
  dependencies:
    - c
    - b
- artifact: e
  path: e
  type: npm
  dependencies:
    - d
       ''')}])
        self.assertEqual(len(c['schedulers']), 1 + 5 + 2)
        scheduler = c['schedulers'][0]
        self.assertTrue(scheduler.dependency_tree == {
            'a': set(),
            'b': set(),
            'c': {'a', 'b'},
            'd': {'c', 'b'},
            'e': {'d'}})

        self.assertItemsEqual(scheduler.builderNames, ['a', 'b', 'c', 'd', 'e'])
        self.assertSetEqual(scheduler.builds_from_change(Change(['a/file'])), {'a'})
        self.assertSetEqual(scheduler.builds_from_change(Change(['a/file', 'c/file'])), {'a', 'c'})

class TestDependencyTree(unittest.TestCase):
    def test_transitive_closure_diamond(self):
        diamond = {
            1: set(),
            2: {1},
            3: {1},
            4: {2, 3}
        }
        self.assertEqual(transitive_closure(diamond, {1}), diamond)
        self.assertEqual(transitive_closure(diamond, {1}), diamond)
        self.assertEqual(transitive_closure(diamond, {3}).keys(), [3, 4])
        self.assertEqual(transitive_closure(diamond, {3})[3], set())
        self.assertEqual(transitive_closure(diamond, {3})[4], {3})

    def test_transitive_closure_forest(self):
        forest = {
            1: set(),
            2: {1},
            3: {1},
            4: {2, 3},
            5: set(),
            6: {5}
        }
        self.assertEqual(transitive_closure(forest, {1}).keys(), [1, 2, 3, 4])
        self.assertEqual(transitive_closure(forest, {5}).keys(), [5, 6])
        self.assertEqual(transitive_closure(forest, {5, 1}).keys(), [1, 2, 3, 4, 5, 6])

    def test_transitive_closure_connected_forest(self):
        forest = {
            1: set(),
            2: {1},
            3: {1},
            4: {2, 3},
            5: set(),
            6: {5, 4}
        }
        self.assertEqual(transitive_closure(forest, {1}).keys(), [1, 2, 3, 4, 6])
        self.assertEqual(transitive_closure(forest, {5}).keys(), [5, 6])
        self.assertEqual(transitive_closure(forest, {3, 4}).keys(), [3, 4, 6])

    def test_transitive_multi_level(self):
        forest = {
            1: set(),
            2: {1},
            3: {2},
            4: {3, 1},
            5: {2},
            6: {5, 3}
        }
        self.assertEqual(transitive_closure(forest, {1}).keys(), [1, 2, 3, 4, 5, 6])
        self.assertEqual(transitive_closure(forest, {3}).keys(), [3, 4, 6])

    def test_builds_that_can_be_built(self):
        forest = {
            1: set(),
            2: {1},
            3: {2},
            4: {3, 1},
            5: set(),
            6: {5, 3}
        }
        self.assertItemsEqual(list(builds_that_can_be_built(forest, set())), [1, 5])
        self.assertItemsEqual(list(builds_that_can_be_built(forest, {1, 5})), [2])
        self.assertItemsEqual(list(builds_that_can_be_built(forest, {1, 5, 3})), [2, 4, 6])

    def test_serialize_deserialize(self):
        simple = {
            1: {'4', '5'},
            2: {'3'}
        }
        json_str = serialize(simple)
        json_dict = json.loads(json_str)
        self.assertEqual(len(json_dict), 2)
        self.assertItemsEqual(json_dict['1'], ['4', '5'])
        self.assertItemsEqual(json_dict['2'], ['3'])

        self.assertTrue(deserialize(json_str), simple)

class TestGit(unittest.TestCase):
    def test_fetch_single_file_from_repo(self):
        self.assertIn('"license": "ISC"',
                      git.fetch_single_file_from_repo(
                          'git@github.com:Natural-Intelligence/ni-build.git',
                          'ops/ci/buildbot/configuration/package.json'))


class TestMasterList(unittest.TestCase):
    def test_fetch_repo_artifact_list(self):
        self.assertTrue(any(artifact['path'] == 'dev/umbrella/bos/article-bos' for artifact in
                            repo_artifact_list.fetch_repo_artifact_list(
                                'git@github.com:Natural-Intelligence/ni-build.git')))
