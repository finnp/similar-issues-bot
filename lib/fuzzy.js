const {Transform} = require('stream')
const merge = require('sorted-merge-stream')
const parallel = require('run-parallel')
const sort = require('stream-sort')
const pump = require('pump')

module.exports = fuzzy

function fuzzy (indexdb, issuesdb, tokens, limit, callback) {
  limit = limit || 1

  const filter = tokens
    .map(token => indexdb.createReadStream({gte: token + '~', lt: token + '~~'}))
    .reduce((a, b) => merge(a, b, keyify))

  const getTopResults = sort({count: limit, compare: byCount})

  getTopResults.on('result', function (topResults) {
    parallel(topResults.map(function (topResult) {
      const key = topResult.key
      return function (cb) {
        issuesdb.get(key, function (err, issue) {
          if (err) return cb() // skip not founds
          const issueObj = JSON.parse(issue)
          issueObj.keywords = topResult.values
          cb(err, issueObj)
        })
      }
    }), function (err, results) {
      if (err) return callback(err)
      callback(null, results)
    })
  })

  pump(
      filter,
      groupStream(getIssueKey, tokenify),
      getTopResults
    )
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
