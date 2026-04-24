#!/usr/bin/env bash
# Run Butler against local repo checkouts (no GITHUB_TOKEN required).
#
# Usage:
#   scripts/butler-local/run.sh [REPO_PATH ...]
#
# If no REPO_PATH is given, defaults to the repo this script lives in.
#
# What it does:
#   1. Clones https://github.com/sadreck/Butler to /tmp/butler (once)
#   2. Creates a Python 3.12 venv and installs Butler's deps
#   3. Copies ingest_local.py alongside Butler's src/
#   4. Runs ingest_local.py -> process -> report
#   5. Leaves the HTML/CSV report at scripts/butler-local/report/
#
# Requires: python3.12, git, sqlite3 (optional), a network connection for the
# initial Butler clone. After that, runs fully offline.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUTLER_DIR="${BUTLER_DIR:-/tmp/butler}"
BUTLER_REPO="${BUTLER_REPO:-https://github.com/sadreck/Butler.git}"
PYTHON="${PYTHON:-python3.12}"
DB="${SCRIPT_DIR}/local.db"
OUTPUT="${SCRIPT_DIR}/report"

if [ ! -d "${BUTLER_DIR}" ]; then
    echo "[butler-local] cloning Butler into ${BUTLER_DIR}"
    git clone --depth 1 "${BUTLER_REPO}" "${BUTLER_DIR}"
fi

if [ ! -d "${BUTLER_DIR}/venv" ]; then
    echo "[butler-local] creating venv (${PYTHON})"
    "${PYTHON}" -m venv "${BUTLER_DIR}/venv"
    "${BUTLER_DIR}/venv/bin/pip" install -q --upgrade pip
    "${BUTLER_DIR}/venv/bin/pip" install -q -r "${BUTLER_DIR}/requirements.txt"
fi

cp "${SCRIPT_DIR}/ingest_local.py" "${BUTLER_DIR}/ingest_local.py"

# Fresh DB every run so we don't accumulate stale state.
rm -f "${DB}"
rm -rf "${OUTPUT}"
mkdir -p "${OUTPUT}"

PATHS=("$@")
if [ "${#PATHS[@]}" -eq 0 ]; then
    PATHS=("${REPO_ROOT}")
fi

PATH_ARGS=()
for p in "${PATHS[@]}"; do
    PATH_ARGS+=(--path "${p}")
done

# Derive --repo for the report from the first path's git remote (org name).
FIRST_PATH="${PATHS[0]}"
REPORT_TARGET="$(git -C "${FIRST_PATH}" config --get remote.origin.url 2>/dev/null \
    | sed -E 's#\.git$##; s#^.*[/:]([^/]+)/[^/]+$#\1#' || true)"
if [ -z "${REPORT_TARGET}" ]; then
    REPORT_TARGET="local"
fi

cd "${BUTLER_DIR}"

echo "[butler-local] ingesting ${#PATHS[@]} path(s)"
./venv/bin/python ingest_local.py --database "${DB}" "${PATH_ARGS[@]}"

echo "[butler-local] processing"
./venv/bin/python butler.py process --database "${DB}"

echo "[butler-local] generating report for org '${REPORT_TARGET}'"
./venv/bin/python butler.py report --database "${DB}" --output "${OUTPUT}" --repo "${REPORT_TARGET}"

echo "[butler-local] report written to: ${OUTPUT}"
