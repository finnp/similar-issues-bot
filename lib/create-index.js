const { Writable } = require('stream')
const pump = require('pump')
const tokenize = require('./tokenize')
const pad = require('./util').pad

module.exports = createIndex

function createIndex (indexdb, issuesdb, keysdb, cb) {
  const createBatch = new Writable({
    objectMode: true,
    write: function (issue, enc, cb) {
      const searchBody = [
        issue.body,
        issue.title,
        issue.labels.map(label => label.name).join(' ')
      ].join(' ')

      const tokens = tokenize(searchBody)
      const keys = tokens.map(token => token + '~' + issue.number)

      keysdb.get(issue.number.toString(), (err, keys) => {
        if (err) return deletedKeys()
        try {
          const batch = JSON.parse(keys).map(key => ({type: 'del', key: key}))
          indexdb.batch(batch, deletedKeys)
        } catch (e) { deletedKeys() }
      })

      function deletedKeys () {
        keysdb.put(issue.number.toString(), JSON.stringify(keys))
        var batch = keys.map(key => ({type: 'put', key: key, value: pad(issue.number)}))
        indexdb.batch(batch)
        cb()
      }
    }
  })

  pump(
    issuesdb.createValueStream({valueEncoding: 'json'}),
    createBatch,
    cb
  )
}
