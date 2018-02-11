# similar-issues-bot

This GitHub bot will reply to new issues on a repository with a list of
similar seeming issues. Useful for projects that get a lot of issues/questions
that might have already been answered.


You can configure the bot by creating a `similar-issues.yml` file in the `.github` directory
of your repository.

Here is an example `similar-issues.yml`:
```yml
template: |
  Check this out 🤖:
  {{#issues}}
  - {{title}} #{{number}}
  {{/issues}}
```


## Tables (Sublevels)
### index

Find issues for keywords, sorted by score.

- Key: `${keyword}~${issueNumber}`, e.g. `chrome~1916`
- Value `${issueTableKey}`, e.g. `01916`

### issue

Get the full github info for an issue.

- Key: `${zeroFilledIssueNumber}`, e.g. `02258`
- Value: `${issueObjectJSON}`, e.g. `{"url":"https://api.gi...`

### keys

Relation from issue numbers to their index entries. For deleting the respective
index entries from the table for a specific isssue.

- Key: `${issueNumber}`, e.g. `999`
- Value: `${indexKeysJSON}`, e.g. `'["m~999","00096`
