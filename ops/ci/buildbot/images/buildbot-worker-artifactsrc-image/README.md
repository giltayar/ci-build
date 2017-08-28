# buildbot-worker-artifactsrc-image
The docker image for buildbot worker that runs the code that changes the `artifactsrc.yml`

## What does it include?
* based off of the official buildbot-worker
* `node`, because the code that changes the `artifactsrc.yml` is written in node.
* `artifactsrc-yml-generator`: The code that creates an `artifactsrc.yml`. *This package should be
  separate from this image, but since I don't have push-authorization to the Nexus, I built it inside (UGLY HACK!)*

