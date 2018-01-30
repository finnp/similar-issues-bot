var level = require('level')
var sublevel = require('level-spaces')
var path = require('path')
var pad = require('./lib/util').pad

var similar = require('./similar')
var db = level(path.join(__dirname, '/db'))

var indexdb = sublevel(db, 'index')
var issuesdb = sublevel(db, 'issues')

issuesdb.get(pad(1690), {valueEncoding: 'json'}, function (err, issue) {
  if (err) return console.error(err)
  similar(issuesdb, indexdb, issue, function (err, list) {
    if (err) return console.log(err)
    console.log(list)
  })
})
