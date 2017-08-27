import git
import yaml

def fetch_repo_artifact_list(gitUrl):
    try:
        package_list_text = git.fetch_single_file_from_repo(gitUrl, 'artifactsrc.yml')

        return yaml.load(package_list_text)
    except Exception as e:
        print 'Problem reading artifactsrc.yml, error:', e
        return []
