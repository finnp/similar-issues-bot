const path = require('path')
const mustache = require('mustache')
const level = require('level')
const sublevel = require('subleveldown')
const eventToPromise = require('event-to-promise')
const similarIssues = require('./')
const fs = require('fs')

const db = level(path.join(__dirname, '/db'))

function similarIssuesForRepo (repo) {
  return similarIssues({level: sublevel(db, repo), repo})
}

const defaultConfig = {
  template: fs.readFileSync(path.join(__dirname, '/template.md'), 'utf8')
}

const repoHandlers = {}

module.exports = robot => {
  robot.on('issues.opened', async context => {
    const config = await context.config('similar-issues.yml', defaultConfig)
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
      context.log('Issues received')
      const keywordList = keywords.join(', ')
      const body = mustache.render(config.template, {issues, keywordList})
      context.github.issues.createComment(context.issue({body}))
    })
  })
}
