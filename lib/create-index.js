var stream = require('stream-wrapper')
var pump = require('pump')
var tokenize = require('./tokenize')
var pad = require('./util').pad

module.exports = createIndex

function createIndex (indexdb, issuesdb, keysdb, cb) {
  var createBatch = stream.writable({objectMode: true}, function (issue, enc, cb) {
    // TODO: Add this as an option? if (issue.comments === 0) return cb()
    var searchBody = [
      issue.body,
      issue.title,
      issue.labels.map(function (l) { return l.name }).join(' ')
    ].join(' ')
    var score = 100
    var tokens = tokenize(searchBody)
    var keys = tokens.map(function (token) {
      return token + '~' + pad(score) + '-' + issue.number
    })
    keysdb.get(issue.number.toString(), function (err, keys) {
      if (err) return deletedKeys()
      try {
        var batch = JSON.parse(keys).map(function (key) {
          return {type: 'del', key: key}
        })
        indexdb.batch(batch, deletedKeys)
      } catch (e) { deletedKeys() }
    })

    function deletedKeys () {
      keysdb.put(issue.number.toString(), JSON.stringify(keys))
      var batch = keys.map(function (key) {
        return { type: 'put', key: key, value: pad(issue.number) }
      })
      indexdb.batch(batch)
      cb()
    }
  })

  pump(
    issuesdb.createValueStream({valueEncoding: 'json'}),
    createBatch,
    cb
  )
}

function hasLabel (issue, name) {
  return issue.labels
    .some(function (label) {
      return label.name === name
    })
}
