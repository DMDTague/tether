# Mobile client gap

## Current state

There is no React Native source in this repository.

`mobile/` and `mobile.worktrees/copilot-fix-toast-and-syntax-errors` were
committed as **gitlinks** — the entry git writes for a submodule:

```
160000 b4f51e0f5cb0d19a9c36018c6387d9cd0e61bc83 0  mobile
160000 b4f51e0f5cb0d19a9c36018c6387d9cd0e61bc83 0  mobile.worktrees/copilot-fix-toast-and-syntax-errors
```

There is no `.gitmodules`, and commit `b4f51e0` is not reachable from this
remote, so:

- `git clone` produces two empty directories
- `git submodule update` cannot resolve them
- `docs/MOBILE_ARCHITECTURE_NOTES.md` documents code that is not here

The pointers were introduced in `2dc2640` (2026-05-22) and have been removed
from the tree. Removing the pointer does not recover the source.

## Recovery

The objects most likely still exist in the local clone the work was done in.
From that clone:

```bash
# 1. Does the commit exist locally?
git cat-file -t b4f51e0f5cb0d19a9c36018c6387d9cd0e61bc83

# 2. If it does, and it is a real repository, publish it as its own repo
#    and wire it up properly:
cd mobile
git remote add origin https://github.com/DMDTague/tether-mobile.git
git push -u origin HEAD

# 3. Then reference it deliberately, from the repository root:
git submodule add https://github.com/DMDTague/tether-mobile.git mobile
git add .gitmodules mobile
```

If the intent was never a submodule — which the `mobile.worktrees/` path
suggests it was not — commit the source as ordinary files instead:

```bash
# from the root of this repository
rm -rf mobile/.git
git add mobile
```

If `git cat-file` reports the object is missing everywhere, check the Expo
build history and any editor local-history for a recoverable snapshot before
treating the work as lost.

## Guardrail

`.github/workflows/ci.yml` now fails the build if any gitlink exists without a
`.gitmodules` file, so this cannot recur silently.
