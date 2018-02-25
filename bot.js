const path = require('path')
const mustache = require('mustache')
const level = require('level')
const sublevel = require('subleveldown')
const Repository = require('./')
const fs = require('fs')

const db = level(path.join(__dirname, '/db'))

const defaultConfig = {
  template: fs.readFileSync(path.join(__dirname, '/template.md'), 'utf8')
}

module.exports = robot => {
  robot.on('issues.opened', async context => {
    const config = await context.config('similar-issues.yml', defaultConfig)
    const repoName = context.payload.repository.full_name
    const similarIssuesRepo = new Repository({
      level: sublevel(db, repoName),
      repo: repoName,
      github: context.github
    })

    context.log('Download issues')
    await similarIssuesRepo.download()

    context.log('Create index')
    await similarIssuesRepo.createIndex()

    context.log('Get similar issues')
    const {issues, keywords} = await similarIssuesRepo.similar(context.payload.issue)

    if (issues.length === 0) return context.log('No similar issues found')

    const keywordList = keywords.join(', ')
    const body = mustache.render(config.template, {issues, keywordList})
    context.github.issues.createComment(context.issue({body}))
  })
}
