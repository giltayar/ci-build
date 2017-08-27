import os
from buildbot.plugins import changes
import repo_artifact_list
from schedulers import create_schedulers
from builders import create_builders
from global_config import setup_global_config

def get_repos_and_packages(git_repos):
    repos_and_packages = []
    for repo in git_repos:
        repos_and_packages.append({
            'repo': repo,
            'artifacts': repo_artifact_list.fetch_repo_artifact_list(repo)})

    return repos_and_packages

def build_config(repos_and_packages):
    c = {}

    ####### GLOBAL CONFIGURATION
    setup_global_config(c)

    ####### CHANGESOURCES
    c['change_source'] = []
    for repo in repos_and_packages:
        c['change_source'].append(changes.GitPoller(
            repo['repo'],
            workdir='gitpoller-workdir',
            branch='master',
            pollinterval=int(os.getenv('GIT_POLL_INTERVAL', 30))))

    ####### SCHEDULERS & BUILDERS
    c['schedulers'] = create_schedulers(repos_and_packages)
    c['builders'] = create_builders(repos_and_packages)

    ### STATUS
    c['status'] = []

    return c
