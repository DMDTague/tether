# Action required: credentials were committed to this repository

`backend/tether.db` was tracked in git. It is a SQLite database containing real
user rows:

| username   | column          |
|------------|-----------------|
| `testuser` | `password_hash` |
| `dmdtague` | `password_hash` |

Both hashes are bcrypt at cost 12, which is strong — but they are public, and
offline cracking has no rate limit. Anyone who cloned this repository has them.

## Do this now

1. **Change the password used for the `dmdtague` account**, and change it
   anywhere else that password was reused. This matters more than anything
   else in this file.

2. **Purge the file from history.** It has been removed from the working tree,
   but it remains in every previous commit until history is rewritten:

   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path backend/tether.db --path backend/static/avatars
   git push --force origin master
   ```

   Force-pushing rewrites shared history. Anyone else with a clone must re-clone.

3. **Consider the GitHub copy.** Even after a force push, GitHub may retain
   unreferenced objects and forks are unaffected. If any forks exist, ask
   GitHub Support to garbage-collect, or treat the hashes as permanently
   exposed and rely on step 1.

## Also removed

- `backend/static/avatars/*.jpg` — 2.2 MB of runtime user uploads (four copies
  of the same 564 KB image). Uploads belong on disk or object storage, not in
  version control.
- `modify_friends.py` — a one-off scratch script at the repository root that
  hardcoded `/Users/dylantague/Desktop/tether/...` and edited files that no
  longer exist.

## Prevention

`.gitignore` now excludes `*.db`, `*.sqlite`, and `backend/static/avatars/*`.
`.github/workflows/ci.yml` fails the build if a database file or a `.env` is
ever tracked again.

Delete this file once steps 1–3 are done.
