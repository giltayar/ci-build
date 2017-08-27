from ShellStepWithName import ShellStepWithName

def add_npm_build_steps(build_factory, has_assets):
    add_install_and_build_steps(build_factory)
    build_factory.addStep(ShellStepWithName(
        'npm test',
        command=_npm_script_command('test')))
    build_factory.addStep(ShellStepWithName(
        'npm run make-assets',
        command=_npm_script_command('make-assets')))
    build_factory.addStep(ShellStepWithName(
        'increment version',
        command='/home/buildbot/npm-version-incrementor/scripts/npm-increment-version.js'))
    build_factory.addStep(ShellStepWithName(
        'npm publish',
        command=_npm_script_command('publish')))
    if has_assets:
        build_factory.addStep(ShellStepWithName(
            'push assets to s3',
            command='/home/buildbot/s3-uploader/scripts/upload-assets-to-s3.js'))

def add_install_and_build_steps(build_factory):
    build_factory.addStep(ShellStepWithName(
        'npm install',
        command=_npm_script_command('install')))
    build_factory.addStep(ShellStepWithName(
        'npm run build',
        command=_npm_script_command('build')))

def _npm_script_command(scriptName):
    npm_prefix = ["npm"]

    if scriptName in ('install', 'publish'):
        return ' '.join(npm_prefix + [scriptName])

    if scriptName == 'test':
        pure_command = npm_prefix + [scriptName]
    else:
        pure_command = npm_prefix + ['run', scriptName]

    return ' '.join(
        ("if jq -e '.scripts.\"" + scriptName + "\"'" +
         " package.json >/dev/null; then").split(' ') +
        [' '] +
        pure_command + ['; fi'])
