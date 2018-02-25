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

## Thanks

Parts of this projects are heavily inspired (aka copied) from [node-modules](https://github.com/mafintosh/node-modules)
by [mafintosh](https://github.com/mafintosh).
