import {run, type ApplicationFunctionOptions, type Probot} from 'probot'
import bodyParser from 'body-parser'
import {getAppInstallations, getInstallationOctokit} from './utils'

function app(app: Probot, {getRouter}: ApplicationFunctionOptions) {
    app.on('issues.opened', async (context) => {
        const issueComment = context.issue({
            body: 'Thanks for opening this issue!',
        })
        return context.octokit.issues.createComment(issueComment)
    })

    app.on(['issues.edited'], async (context) => {
        console.log(context.payload)
        const issueComment = context.issue({
            body: 'edited!',
        })
        return context.octokit.issues.createComment(issueComment)
    })

    app.onError(async (error) => {
        app.log.error(error)
    })

    if (!getRouter) {
        return
    }

    const router = getRouter()

    router.use(bodyParser.json())

    router.post('/copilot-issue-helper', async (req, res) => {
        const body = req.body
        const {org, repo, issue_url} = body

        console.log(org, repo, issue_url)

        const installations = await getAppInstallations()

        const installationId = installations.find((installation) => {
            const {full_name} = installation
            return full_name === `${org}/${repo}`
        })?.installationId
        if (!installationId) {
            res.status(404).send('Installation not found')
            return
        }
        const octokit = getInstallationOctokit(installationId)

        const {data} = await octokit.rest.issues.get({
            owner: org,
            repo: repo,
            issue_number: +issue_url.split('/').pop(),
        })

        res.status(200).send({
            title: data.title,
            body: data.body,
        })
    })

    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully')
        process.exit(0)
    })
}

run(app).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`Something went wrong`)
    // eslint-disable-next-line no-console
    console.error(error)
})
