const sublevel = require('subleveldown')
const level = require('level')

const createIndex = require('./lib/create-index')
const download = require('./lib/download')
const similar = require('./lib/similar')

module.exports = Repository

function Repository (opts) {
  const db = opts.level || level(opts.storagePath)

  this.github = opts.github
  this.repo = opts.repo
  this.indexdb = sublevel(db, 'index')
  this.issuesdb = sublevel(db, 'issues')
  this.keysdb = sublevel(db, 'keys')
}

Repository.prototype.download = function () {
  return download(this.github, this.issuesdb, this.repo)
}

Repository.prototype.createIndex = function () {
  return createIndex(this.indexdb, this.issuesdb, this.keysdb)
}

Repository.prototype.similar = function (issue) {
  return similar({
    indexdb: this.indexdb,
    issuesdb: this.issuesdb,
    issue
  })
}

Repository.prototype.update = async function () {
  await this.download()
  await this.createIndex()
}
