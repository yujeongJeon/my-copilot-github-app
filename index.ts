import {run, type Probot} from 'probot'

function App(app: Probot) {
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

    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully')
        process.exit(0)
    })
}

run(App).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`Something went wrong`)
    // eslint-disable-next-line no-console
    console.error(error)
})
