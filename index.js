var sublevel = require('level-spaces')
var EventEmitter = require('events')
var level = require('level')

var createIndex = require('./lib/create-index')
var download = require('./lib/download')
var similar = require('./lib/similar')
var search = require('./lib/search')
var pad = require('./lib/util').pad

module.exports = function (opts) {
  var db = opts.level || level(opts.storagePath)
  var repo = opts.repo

  var indexdb = sublevel(db, 'index')
  var issuesdb = sublevel(db, 'issues')
  var keysdb = sublevel(db, 'keys')

  return {
    search: search.bind(this, indexdb, issuesdb),
    similar: function (opts, cb) {
      opts.indexdb = indexdb
      opts.issuesdb = issuesdb
      return similar(opts, cb)
    },
    update: update,
    repeatedUpdate: repeatedUpdate,
    getIssues: getIssues
  }

  function getIssues (from, to) {
    var opts = {}
    opts.valueEncoding = 'json'
    opts.keyEncoding = 'utf8'
    if (from) opts.gte = pad(from)
    if (to) opts.lte = pad(to)

    return issuesdb.createValueStream(opts)
  }

  function update (githubKey, bus, cb) {
    bus.emit('log', 'Update start.')
    bus.emit('log', 'Downloading...')
    download(issuesdb, githubKey, repo, function (err) {
      if (err) return cb(err)
      bus.emit('log', 'Creating the index...')
      createIndex(indexdb, issuesdb, keysdb, function (err) {
        if (err) return cb(err)
        bus.emit('log', 'Update done.')
        cb()
      })
    })
  }

  function repeatedUpdate (githubKey, interval) {
    var bus = new EventEmitter()
    interval = interval || 60 * 60 * 1000
    function loop () {
      update(githubKey, bus, function (err) {
        if (err) bus.emit('error', err)
        setTimeout(loop, interval)
      })
    }
    process.nextTick(loop)
    return bus
  }
}
