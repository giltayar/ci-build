import itertools
from DependencyTreeScheduler import DependencyTreeScheduler
from buildbot.plugins import util, schedulers

def normalize_with_slash_ending(path):
    if path.endswith('/'):
        return path
    else:
        return path + '/'

def file_is_important(change, artifact):
    path_of_artifact = normalize_with_slash_ending(artifact['path'])

    return any(file.startswith(path_of_artifact) for file in change.files)

def find_artifact_in_repo(repo, artifact_name):
    try:
        return next(artifact
                    for artifact in repo['artifacts']
                    if artifact['artifact'] == artifact_name)
    except StopIteration:
        return None

def create_schedulers(repos_and_packages):
    return [
        DependencyTreeScheduler(
            'dependency-tree',
            build_dependency_tree=create_build_dependency_tree(repo['artifacts']),
            builds_from_change=builds_from_change_func(repo['artifacts']),
            change_filter=util.ChangeFilter(
                repository=repo['repo'],
                branch='master'))
        for repo in repos_and_packages
    ] + [
        schedulers.ForceScheduler(
            artifact['artifact'] + '-force',
            builderNames=[artifact['artifact']],
            buttonName='Force'
        )
        for repo in repos_and_packages for artifact in repo['artifacts']
    ] + _flatten([
        (schedulers.SingleBranchScheduler(
            'artifactsrc-yml',
            fileIsImportant=_artifactsrc_needs_rebuilding,
            onlyImportant=True,
            change_filter=util.ChangeFilter(
                repository=repo['repo'],
                branch='master'),
            builderNames=['build-artifactsrc-yml']
        ), schedulers.ForceScheduler(
            'artifactsrc-yml-force',
            builderNames=['build-artifactsrc-yml'],
            buttonName='Force'
        ))
        for repo in repos_and_packages
    ])

def _artifactsrc_needs_rebuilding(change):
    if '#nobuild' in change.comments:
        return False
    return any(_is_ci_file(file) for file in change.files)

def _is_ci_file(changeFile):
    return (changeFile.endswith('/package.json')
            or changeFile.endswith('/Dockerfile')
            or changeFile.endswith('/artifactrc.yml'))

def builds_from_change_func(artifacts):
    def builds_from_change(change):
        files = change.files
        return set([
            artifact['artifact'] for artifact in artifacts
            if any(file.startswith(normalize_with_slash_ending(artifact['path'])) for file in files)
        ])

    return builds_from_change

def create_build_dependency_tree(artifacts):
    return dict([
        (artifact['artifact'], set(artifact.get('dependencies', [])))
        for artifact in artifacts
    ])

def _flatten(l):
    return list(itertools.chain(*l))
