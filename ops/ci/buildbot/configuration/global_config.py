import os
from buildbot.plugins import worker
from buildbot.plugins import reporters

def setup_global_config(c):
    ####### PROJECT IDENTITY
    c['title'] = "Natural Intelligence"
    c['titleURL'] = "http://www.naturalint.com/"
    c['buildbotURL'] = os.environ.get("BUILDBOT_WEB_URL", "http://localhost:8010/")
    c['www'] = dict(port=os.environ.get("BUILDBOT_WEB_PORT", 8010),
                    plugins=dict(waterfall_view={}, console_view={}),
                    allowed_origins=['*'])

    ####### DB URL
    c['db'] = {
        # This specifies what database buildbot uses to store its state.  You can leave
        # this at its default for all but the largest installations.
        'db_url' : os.environ.get("BUILDBOT_DB_URL", "sqlite://").format(**os.environ),
    }
    ####### WORKERS
    c['workers'] = [
        worker.Worker("build-npm", 'pass'),
        worker.Worker("build-docker-npm", 'pass'),
        worker.Worker("build-artifactsrc-yml", 'pass')
    ]
    c['protocols'] = {'pb': {'port': os.environ.get("BUILDBOT_WORKER_PORT", 9989)}}

    ####### EMAIL
    c['services'] = [
        reporters.MailNotifier(
            fromaddr="sendemail31415@gmail.com",
            relayhost=os.environ.get("SMTP_SERVER", "smtp.gmail.com"),
            mode=('change', 'failing'),
            buildSetSummary=True,
            smtpPort=int(os.environ.get("SMTP_PORT", 465)),
            useSmtps=int(os.environ.get("USE_SMTPS", True)),
            smtpUser='sendemail31415',
            smtpPassword='yamoostav')
    ]
