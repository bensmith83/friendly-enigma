# Butler local-ingest

Run [Butler](https://github.com/sadreck/Butler) against on-disk repo
checkouts instead of pulling from GitHub. No PAT required.

## What this is

Butler's normal flow is `download` (GitHub API) → `process` → `report`.
`ingest_local.py` is a drop-in replacement for the `download` phase that
reads workflows straight from a local filesystem, populating the same
SQLite schema so the downstream `process` and `report` phases run
unchanged.

## Usage

```bash
scripts/butler-local/run.sh                      # scan this repo
scripts/butler-local/run.sh /path/to/other/repo  # scan a different checkout
scripts/butler-local/run.sh repo-a repo-b        # scan multiple at once
```

Output lands at `scripts/butler-local/report/index.html`.

The runner clones Butler into `/tmp/butler` (first run only), creates a
Python 3.12 venv, installs Butler's requirements, and then:

1. `ingest_local.py` → populates `local.db`
2. `butler.py process` → extracts jobs, steps, variables, runners
3. `butler.py report` → writes HTML/CSV to `report/`

## What works vs. what doesn't

Works: workflow inventory, event triggers, third-party action references
(all resolved against `uses:` lines), runner detection, secret/variable
extraction, trusted-org classification.

Skipped vs. a real Butler run: no GitHub API means no star counts,
fork/archive flags, or resolving a pinned 40-char SHA back to a tag name
(so third-party `ref_resolved_to` shows as `unknown`). The local repo
itself is marked `visibility=local`.
