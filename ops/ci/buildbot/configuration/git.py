import tempfile
import os.path
import subprocess

LOCAL_REPOS = dict()
local_repos_folder = None
def fetch_single_file_from_repo(repo, path_to_file):
    global local_repos_folder
    if not local_repos_folder:
        local_repos_folder = tempfile.mkdtemp()

    local_repo = LOCAL_REPOS.get(repo)
    if not local_repo:
        local_repo = tempfile.mkdtemp(dir=local_repos_folder)
        LOCAL_REPOS[repo] = local_repo

    if not os.path.exists(os.path.join(local_repo, '.git')):
        print 'cloning', repo, 'into', local_repo
        clone_process = subprocess.Popen(['git', 'clone', '-q', '--depth', '1', '--no-checkout',
                                          repo, '.'],
                                         cwd=local_repo)
        clone_process_retcode = clone_process.wait()
        if clone_process_retcode:
            raise Exception('could not clone repo {} into dir {}'.format(repo, local_repo))
    else:
        print 'fetching', repo, 'in', local_repo
        fetch_process = subprocess.Popen(['git', 'fetch'], cwd=local_repo)
        fetch_process_retcode = fetch_process.wait()
        if fetch_process_retcode:
            raise Exception('could not fetch repo {} into dir {}'.format(repo, local_repo))
        print 'fetched', repo

    show_process = subprocess.Popen(['git', '--no-pager', 'show', 'origin/master:{}'.
                                     format(path_to_file)], cwd=local_repo, stdout=subprocess.PIPE)
    (show_stdout, _) = show_process.communicate()
    show_process_retcode = show_process.wait()
    if show_process_retcode:
        raise Exception('could not read file {} in repo {} in dir {}'.
                        format(path_to_file, repo, local_repo))

    return show_stdout
