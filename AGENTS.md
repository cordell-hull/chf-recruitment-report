# Contributing

## Preview link

Previews are served from the `cordell-hull-staging` org, so they can't touch real school
data. Commit `62536b8` adds the staging-only banner and `noindex` — cherry-pick it, push,
and repoint the site:

```bash
git remote add staging git@github.com:cordell-hull-staging/chf-recruitment-report.git
git fetch staging
git switch -c staging/my-change my-change
git cherry-pick 62536b8
git push -f staging staging/my-change
gh api -X PUT repos/cordell-hull-staging/chf-recruitment-report/pages \
  -f 'source[branch]=staging/my-change' -f 'source[path]=/'
gh api -X POST repos/cordell-hull-staging/chf-recruitment-report/pages/builds
```

Repointing the site does not reliably trigger a rebuild, so request the build explicitly
with that last call. Otherwise the API reports `"status": "built"` while the old branch is
still being served — check the build actually ran before trusting the link:

```bash
gh api repos/cordell-hull-staging/chf-recruitment-report/pages/builds/latest \
  --jq '.status, .created_at'
curl -s https://cordell-hull-staging.github.io/chf-recruitment-report/config/version.js
```

Link: https://cordell-hull-staging.github.io/chf-recruitment-report/ (~1 min to build).
Only one branch can be previewed at a time. Never merge the guard commit into `main`.
