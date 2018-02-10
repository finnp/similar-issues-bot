const pify = require('pify')
const pad = require('./util').pad

module.exports = downloadIssues

async function downloadIssues (github, issuesdb, repoSlug, cb) {
  const [owner, repo] = repoSlug.split('/')
  let response = await github.issues.getForRepo({owner, repo, state: 'all', per_page: 100})
  let {data} = response
  while (github.hasNextPage(response)) {
    response = await github.getNextPage(response)
    data = data.concat(response.data)
  }

  const batch = data.map(issue => ({
    type: 'put',
    key: pad(issue.number),
    value: JSON.stringify(issue)
  }))

  await pify(issuesdb.batch.bind(issuesdb))(batch)
}
