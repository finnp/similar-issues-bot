const tokenize = require('./tokenize')
const concat = require('concat-stream')
const pump = require('pump')
const search = require('./fuzzy')
const Transform = require('stream').Transform

const tokenizer = new Transform({
  objectMode: true,
  transform: function (data, encoding, callback) {
    this.push(tokenize(data.title + ' ' + data.body))
    callback(null)
  }
})

module.exports = async function (opts) {
  const issuesdb = opts.issuesdb
  const indexdb = opts.indexdb
  const issue = opts.issue

  const numberOfKeywords = opts.numberOfKeywords || 15
  const numberOfResults = opts.numberOfResults || 5

  const {overallTermFrequency, numberOfDocuments} = await calculateOverallTermFrequency(issuesdb)
  const keywords = getTopKeywords(issue, overallTermFrequency, numberOfDocuments, numberOfKeywords)
  if (keywords.length === 0) return {issues: [], keywords: []}

  const issues = await search(indexdb, issuesdb, keywords, numberOfResults)
  return {issues, keywords}
}

function getTopKeywords (issue, overallTermFrequency, numberOfDocuments, numberOfKeywords) {
  const tokens = tokenize(issue.title + ' ' + issue.body)
  const result = tokens
    .filter(token => !!overallTermFrequency[token])
    .map(token=> [token, Math.log(numberOfDocuments / overallTermFrequency[token])])
    .sort((a, b) => a[1] < b[1])

  return result.slice(0, numberOfKeywords).map(token => token[0])
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

function calculateOverallTermFrequency (issuesdb) {
  return new Promise((resolve, reject) => {
    const counter = createCountStream()
    pump(
      issuesdb.createValueStream({valueEncoding: 'json'}),
      tokenizer,
      counter,
      concat(function (whole) {
        var numberOfDocuments = counter.value
        var overallTermFrequency = countValues(whole)
        resolve({overallTermFrequency, numberOfDocuments})
      }),
      err => { if (err) reject(err) }
    )
  })
}
