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
    .reduce((a,b) => merge(a, b, keyify))

  const getTopResults = sort({ count: limit,
    compare: function (left, right) {
      const a = getCount(left)
      const b = getCount(right)
      return a < b ? -1 : a > b ? +1 : 0
    }})

  getTopResults.on('result', function (topResults) {
    parallel(topResults.map(function (topResult) {
      const key = topResult.key
      return function (cb) {
        issuesdb.get(key, function (err, issue) {
          if (err) return cb() // skip not founds
          cb(err, JSON.parse(issue))
        })
      }
    }), function (err, results) {
      if (err) return callback(err)
      callback(null, results)
    })
  })

  pump(
      filter,
      countStream(getValue),
      getTopResults
    )
}

function getValue (obj) {
  return obj.value
}

function getCount (obj) {
  return obj.count
}

function keyify (data) {
  return data.key.slice(data.key.lastIndexOf('~') + 1)
}

function countStream (getKey) {
  var last = null
  return new Transform({
    objectMode: true,
    transform: function (data, enc, cb) {
      if (last && getKey(data) === last.key) {
        last.count++
      } else {
        if (last) this.push(last)
        last = {key: getKey(data), count: 1}
      }
      cb()
    }
  })
}
