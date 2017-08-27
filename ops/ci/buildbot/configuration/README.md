# Buildbot Python configuration file
These are the configuration file that are created for our buildbot master.
They are packaged (via `npm run build`) to `master.tar.gz`. This is the file that will get installed
into the buildbot-master image.

## Running configuration locally
To run the configuration locally, use the `local-run` package, which is a sibling package to this one.

## Using virtualenv
This package uses virtualenv (which you need to install manually via `pip install virtualenv`), 
and the virtualenv for this package is initialized via npm's `prepublish` (see `package.json`).
If you want code completion, my tip for you is to pip install all the requirements for this virtualenv 
globally using `pip install -r requirements.txt`.

# Overview of the code
## master.cfg
This is the file that buildbot runs, and it's a simple thing that for each repo that is defined in the environment
variable `REPOS_TO_BUILD`, it will load its `artifactsrc.yml`. It will send that list of repos and `artifactsrc.yml`-s
to `build_config`, where the real magic happens.

## build_config.py
This file doesn't do a lot, but rather calls other packages to:
* Create global configuration stuff (`global_config.py`). The only interesting stuff there is the email notification
  stuff.
* Create schedulers (`schedulers.py`)
* Create builders (`builders.py`)

The only thing it _does_ create is the `GitPoller` change source, to check for changes in the repos. This is standard
stuff in buildbot.

## builders.py - creates the builders
For each artifact in each repo (as defined in `artifactsrc.yml`), it will create a builder.
The builder checks the type of artifact, and builds the build steps accordingly.

Nothing interesting here, except for the fact that when running an npm script (e.g. '`npm run build`' or '`npm test`'), 
it won't run that script if there is no entry in the `package.json` for that script.
It does this by wrapping the `npm run` with an `if` that uses `jq` to check for the existence of that script.
(`jq` is installed as part of the `buildbot-docker-npm-image` docker image.)

Another interesting thing is `MonoRepoGitStep` which is a special build step we wrote here. It inherits from the builtin
buildbot plugin `GitStep` and overrides the `copy` method as a hack. It is very similar to the regular `copy` method,
except that the sourcedir is not the `srcdir` but rather `srcdir + artifactpath`.

## schedulers.py - creates the scheduler
It creates one regular `ForceScheduler` for each artifact, that runs the builds created in `builders.py`. _And_ it 
creates _one_ `DependencyTreeScheduler` that handles all commits from the `GitPoller` and knows to build
everything in the correct dependency graph order.

## DependencyTreeScheduler - a scheduler that schedules builds according to dependency graph
This scheduler accepts two important parameters -
* `build_dependency_tree`: the dependency graph created from the `artifactsrc.yml` - 
  a dict from artifact to a set of dependent artifacts.
* `builds_from_change`: a function that given a `change` (a buildbot object that defines what a change consists of)
  will return a set of artifact names that need to be built (without their dependencies).

The way it works is thus:
* When activated (in `active`):
  * call `startConsumingChanges` to get notified (via `gotChange`) of the changes from the change source.
  * It also to all build completions, in order to trigger other builds based on the dependency graph.
* When getting changes (in `gotChange`):
  * Determines *all* the builds to build using the `transitive_closure` of the build in the dependency graph
  * Stores this `to_build` list in the state of the scheduler.
  * Figures out from the `to_build` list which builds can be built now (by finding the ones that have no dependencies 
    or whose dependencies are all built already).
  * Generates builds for them using `addBuildsetForChanges`.
* When those builds are complete (in `_buildset_complete_cb`):
  * deserializes the `to_build` and `already_built` from scheduler state.
  * if the result is success:
    * Determine which builds still need to be built (`to-build - already_built`)
    * Figures out from this list which builds can be built now (by finding the ones that have no dependencies 
      or whose dependencies are all built already).
    * Generates builds for them using `addBuildsetForChanges`.
  * if the result is failure:
    * Determine which builds will be "affected" and have not been built yet.
    * Add them to `already_built` so that they won't be built.
