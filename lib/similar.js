var tokenize = require('./tokenize')
var concat = require('concat-stream')
var pump = require('pump')
var search = require('./fuzzy')
var Transform = require('stream').Transform

var tokenizer = new Transform({
  objectMode: true,
  transform: function (data, encoding, callback) {
    this.push(tokenize(data.title + ' ' + data.body))
    callback(null)
  }
})

module.exports = function (opts, cb) {
  var issuesdb = opts.issuesdb
  var indexdb = opts.indexdb
  var issue = opts.issue
  var numberOfKeywords = opts.numberOfKeywords || 15
  var numberOfResults = opts.numberOfResults || 5
  // TODO: The term frequencies could be saved in a database
  function calculateOverallTermFrequency (cb) {
    var counter = createCountStream()
    pump(
      issuesdb.createValueStream({valueEncoding: 'json'}),
      tokenizer,
      counter,
      concat(function (whole) {
        var numberOfDocuments = counter.value
        var overallTermFrequency = countValues(whole)
        cb(null, overallTermFrequency, numberOfDocuments)
      })
    )
  }

  calculateOverallTermFrequency(function (err, overallTermFrequency, numberOfDocuments) {
    if (err) return cb(err)
    getSimilarIssues(issue, overallTermFrequency, numberOfDocuments)
  })

  function getSimilarIssues (issue, overallTermFrequency, numberOfDocuments) {
    var tokens = tokenize(issue.title + ' ' + issue.body)
    var result = tokens
      .filter(function (token) {
        return !!overallTermFrequency[token]
      })
      .map(function (token) {
        return [token, Math.log(numberOfDocuments / overallTermFrequency[token])]
      })
      .sort(function (a, b) {
        return a[1] < b[1]
      })
    if (!result[0]) return
    var keywords = result.slice(0, numberOfKeywords)
      .map(function (token) {
        if (token) return token[0]
      })
    search(indexdb, issuesdb, keywords, numberOfResults, function (err, issues) {
      if (err) return cb(err)
      cb(null, issues, keywords)
    })
  }
}

function createCountStream () {
  var count = 0
  var transform = new Transform({
    objectMode: true,
    transform: function (data, encoding, callback) {
      count++
      callback(null, data)
    }
  })
  transform.on('end', function () {
    transform.value = count
  })
  return transform
}

function countValues (tokens) {
  var termFrequencies = {}
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]
    if (termFrequencies[token]) {
      termFrequencies[token]++
    } else {
      termFrequencies[token] = 1
    }
  }
  return termFrequencies
}