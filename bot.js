const path = require('path')
const level = require('level')
const mustache = require('mustache')
const sublevel = require('level-spaces')

const similar = require('./similar')
const db = level(path.join(__dirname, '/db'))

const indexdb = sublevel(db, 'index')
const issuesdb = sublevel(db, 'issues')

const defaultTemplate = `
These issues might be related:

{{#issues}}
- {{title}} #{{number}}
{{/issues}}

Based on this keywords: {{keywordList}}
`

module.exports = robot => {
  robot.on('issues.opened', async context => {
    const opts = {
      issuesdb,
      indexdb,
      issue: context.payload.issue
    }
    similar(opts, (err, issues, keywords) => {
      if (err) return console.log(err)
      const keywordList = keywords.join(', ')
      const body = mustache.render(defaultTemplate, {issues, keywordList})
      context.github.issues.createComment(context.issue({body}))
    })
  })
}
