const pify = require('pify')
const {Transform} = require('stream')
const merge = require('sorted-merge-stream')
const sort = require('stream-sort')
const pump = pify(require('pump'))
const go = require('go-for-it')

module.exports = fuzzy

async function fuzzy (indexdb, issuesdb, tokens, limit) {
  limit = limit || 1

  const filter = tokens
    .map(token => indexdb.createReadStream({gte: token + '~', lt: token + '~~'}))
    .reduce((a, b) => merge(a, b, keyify))

  const topResults = sort({count: limit, compare: byCount})

  await pump(
    filter,
    groupStream(getIssueKey, tokenify),
    topResults
  )

  const results = await Promise.all(topResults.get().map(getFullResult))

  return results.filter(isTruthy)

  async function getFullResult ({key, values}) {
    const [err, issue] = await go(issuesdb.get(key))
    if (err) return // skip not founds
    const issueObj = JSON.parse(issue)
    issueObj.keywords = values
    return issueObj
  }
}

function isTruthy (value) {
  return !!value
}

function getIssueKey (obj) {
  return obj.value
}

function getCount (obj) {
  return obj.values.length
}

function keyify (data) {
  return data.key.slice(data.key.lastIndexOf('~') + 1)
}

function tokenify (data) {
  return data.key.slice(0, data.key.lastIndexOf('~'))
}

function byCount (left, right) {
  const a = getCount(left)
  const b = getCount(right)
  return a < b ? -1 : a > b ? +1 : 0
}

function groupStream (keyify, formatData) {
  var last = null
  return new Transform({
    objectMode: true,
    transform: function (data, enc, cb) {
      if (last && keyify(data) === last.key) {
        last.values.push(formatData(data))
      } else {
        if (last) this.push(last)
        last = {key: keyify(data), values: [formatData(data)]}
      }
      cb()
    }
  })
}
