import {type Probot} from 'probot'

export default (app: Probot) => {
    app.on('issues.opened', async (context) => {
        const issueComment = context.issue({
            body: 'Thanks for opening this issue!',
        })
        return context.octokit.issues.createComment(issueComment)
    })

    app.onError(async (error) => {
        app.log.error(error)
    })
}

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    process.exit(0)
})
