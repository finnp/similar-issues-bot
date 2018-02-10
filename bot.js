const path = require('path')
const mustache = require('mustache')

const similar = require('./similar')

const nodeschool = require('./')({
  storagePath: path.join(__dirname, '/db'),
  repo: 'nodeschool/discussions'
})

const defaultTemplate = `
These issues might be related:

{{#issues}}
- {{title}} #{{number}}
{{/issues}}

Based on this keywords: {{keywordList}}
`

module.exports = robot => {
  robot.on('installation_repositories.added', async context => {
    nodeschool.repeatedUpdate(process.env.GH_KEY)
      .on('log', function (log) {
        robot.log(log)
      })
      .on('error', function (err) {
        robot.log.error(err)
      })
  })

  robot.on('issues.opened', async context => {
    const opts = {
      issuesdb,
      indexdb,
      issue: context.payload.issue
    }
    nodeschool.similar(opts, (err, issues, keywords) => {
      if (err) return context.log(err)
      const keywordList = keywords.join(', ')
      const body = mustache.render(defaultTemplate, {issues, keywordList})
      context.github.issues.createComment(context.issue({body}))
    })
  })
}
