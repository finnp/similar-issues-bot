const level = require('level')
const sublevel = require('level-spaces')
const path = require('path')
const pad = require('./lib/util').pad

const similar = require('./similar')
const db = level(path.join(__dirname, '/db'))

const indexdb = sublevel(db, 'index')
const issuesdb = sublevel(db, 'issues')


var template = (issueList, keywords) => (`
These issues might be related:

${issueList}

Bases on this keywords: ${keywords}
`)

module.exports = robot => {
  robot.on('issues.opened', async context => {
    const issue = context.payload.issue
    similar(issuesdb, indexdb, issue, (err, issues, keywords) => {
      if (err) return console.log(err)
      const issueList = issues
        .map(issue => `- ${issue.title} #${issue.number}`)
        .join('\n')
      context.github.issues.createComment(context.issue({
        body: template(issueList, keywords.join(', '))
      }))
    })
  })
}
