const path = require('path')
const mustache = require('mustache')
const level = require('level')
const sublevel = require('subleveldown')
const eventToPromise = require('event-to-promise')
const similarIssues = require('./')

const db = level(path.join(__dirname, '/db'))

function similarIssuesForRepo (repo) {
  return similarIssues({level: sublevel(db, repo), repo})
}

const defaultTemplate = `
These issues might be related:

{{#issues}}
- {{title}} #{{number}}
{{/issues}}

Based on this keywords: {{keywordList}}
`

const repoHandlers = {}

module.exports = robot => {
  robot.on('issues.opened', async context => {
    const repoName = context.payload.repository.full_name
    let repoHandler = repoHandlers[repoName]
    if (!repoHandler) {
      robot.log(`New repository: ${repoName}`)
      repoHandler = similarIssuesForRepo(repoName)
      repoHandlers[repoName] = repoHandler

      const repeatUpdate = repoHandler.repeatedUpdate(context.github)
      repeatUpdate.on('log', log => robot.log(`${repoName}: ${log}`))
      repeatUpdate.on('error', err => robot.log.error(err))

      await eventToPromise(repeatUpdate, 'complete')
    }

    const issue = context.payload.issue
    repoHandler.similar(issue, (err, issues, keywords) => {
      if (err) return context.log(err)
      const keywordList = keywords.join(', ')
      const body = mustache.render(defaultTemplate, {issues, keywordList})
      context.github.issues.createComment(context.issue({body}))
    })
  })
}
