#!/usr/bin/env python3
"""Populate a Butler SQLite database from on-disk repo checkouts.

Butler (https://github.com/sadreck/Butler) normally pulls workflow files and
metadata straight from the GitHub API. This script stands in for that
`download` phase for code we already have locally: it walks a repo, reads
`.github/workflows/*.y?ml` plus any top-level `action.yml`/`action.yaml`, and
writes the same rows into Butler's database that a real download would have.

After running this, use Butler's normal `process` and `report` commands
against the same `--database` file.

Run from inside a Butler checkout (so `src/...` imports resolve), e.g.:

    python ingest_local.py \\
      --database ./local.db \\
      --path /path/to/repo \\
      --path /path/to/other-repo:my-org/other-repo
"""

import argparse
import os
import subprocess
import sys

from src.database.database import Database
from src.libs.components.org import OrgComponent
from src.libs.components.repo import RepoComponent
from src.libs.components.workflow import WorkflowComponent
from src.libs.constants import (
    GitHubRefType,
    PollStatus,
    RepoStatus,
    RepoVisibility,
    WorkflowStatus,
    WorkflowType,
)
from src.libs.exceptions import InvalidRepoFormat
from src.libs.instances.workflow import WorkflowInstance
from src.libs.utils import Utils


def _git(repo_path, *args):
    try:
        r = subprocess.run(
            ["git", "-C", repo_path, *args],
            capture_output=True, text=True, check=False, timeout=15,
        )
        return r.stdout.strip()
    except Exception:
        return ""


def git_info(repo_path):
    branch = _git(repo_path, "rev-parse", "--abbrev-ref", "HEAD") or "HEAD"
    sha = _git(repo_path, "rev-parse", "HEAD") or ("0" * 40)
    remote = _git(repo_path, "config", "--get", "remote.origin.url")
    return branch, sha, remote


def parse_remote(remote_url):
    if not remote_url:
        return None, None
    s = remote_url
    if s.endswith(".git"):
        s = s[:-4]
    if "://" in s:
        s = s.split("://", 1)[1]
    if "@" in s:
        s = s.split("@", 1)[1]
    s = s.replace(":", "/")
    parts = [p for p in s.split("/") if p]
    if len(parts) >= 2:
        return parts[-2], parts[-1]
    return None, None


def collect_workflow_files(repo_root):
    """Return workflow/action files relative to repo_root."""
    files = []
    wf_dir = os.path.join(repo_root, ".github", "workflows")
    if os.path.isdir(wf_dir):
        for name in sorted(os.listdir(wf_dir)):
            full = os.path.join(wf_dir, name)
            if os.path.isfile(full) and Utils.is_yaml_extension(name):
                files.append(os.path.join(".github", "workflows", name))
    for name in ("action.yml", "action.yaml"):
        if os.path.isfile(os.path.join(repo_root, name)):
            files.append(name)
    return files


def _guess_ref_type(ref):
    if not ref:
        return GitHubRefType.UNKNOWN
    if len(ref) == 40 and all(c in "0123456789abcdef" for c in ref.lower()):
        return GitHubRefType.COMMIT
    return GitHubRefType.BRANCH


def _create_child(database, parent_workflow, uses):
    try:
        child_org = OrgComponent(uses)
        child_org_db = database.orgs().create(child_org)
        child_org.id = child_org_db.id

        child_repo = RepoComponent(uses)
        child_repo.org.id = child_org.id
        if child_repo.ref and child_repo.ref_type == GitHubRefType.UNKNOWN:
            child_repo.ref_type = _guess_ref_type(child_repo.ref)
        child_repo_db = database.repos().create(child_repo)
        child_repo.id = child_repo_db.id

        child_wf = WorkflowComponent(uses)
        child_wf.repo.id = child_repo.id
        child_wf.repo.org.id = child_org.id
        if uses.lower().startswith("docker://"):
            child_wf.type = WorkflowType.DOCKER
        child_wf_db = database.workflows().create(child_wf)
        child_wf.id = child_wf_db.id

        database.workflows().link_workflows(parent_workflow, child_wf)
    except InvalidRepoFormat:
        pass


def ingest_repo(database, repo_path, org_name, repo_name, log):
    repo_path = os.path.realpath(repo_path)
    branch, sha, remote = git_info(repo_path)

    if not (org_name and repo_name):
        r_org, r_name = parse_remote(remote)
        org_name = org_name or r_org or "local"
        repo_name = repo_name or r_name or os.path.basename(repo_path)

    log(f"ingesting {org_name}/{repo_name} @ {branch} ({sha[:8]}) from {repo_path}")

    org = OrgComponent(org_name)
    org_db = database.orgs().create(org)
    org.id = org_db.id

    repo = RepoComponent(f"{org_name}/{repo_name}")
    repo.org.id = org.id
    repo.ref = branch
    repo.ref_type = GitHubRefType.BRANCH
    repo.ref_commit = sha
    repo.resolved_ref = branch
    repo.resolved_ref_type = GitHubRefType.BRANCH
    repo.default_branch = branch
    repo.visibility = RepoVisibility.LOCAL
    repo.status = RepoStatus.OK
    repo.poll_status = PollStatus.SCANNED
    repo_db = database.repos().create(repo)
    repo.id = repo_db.id

    wf_files = collect_workflow_files(repo_path)
    if not wf_files:
        database.repos().set_status(repo.id, RepoStatus.NO_WORKFLOWS)
        log("  no workflows found")
        database.commit()
        return

    for wf_path in wf_files:
        abs_path = os.path.join(repo_path, wf_path)
        contents = Utils.read_file(abs_path)
        if contents is None:
            log(f"  skip unreadable: {wf_path}")
            continue

        workflow = WorkflowComponent(f"{org_name}/{repo_name}/{wf_path}@{branch}")
        workflow.repo = repo
        workflow.status = WorkflowStatus.NONE
        wf_db = database.workflows().create(workflow)
        workflow.id = wf_db.id

        data = Utils.load_yaml(contents)
        if not data or isinstance(data, str):
            database.workflows().update_contents(workflow.id, contents, None)
            database.workflows().update_status(workflow.id, WorkflowStatus.ERROR)
            log(f"  yaml parse error: {wf_path}")
            continue

        if workflow.type == WorkflowType.WORKFLOW:
            try:
                instance = WorkflowInstance(data, workflow.repo)
                for job in instance.jobs:
                    for step in job.steps:
                        uses = step.uses
                        if not uses or uses.startswith("${{"):
                            continue
                        _create_child(database, workflow, uses)
            except Exception as e:
                log(f"  warn: child linking failed for {wf_path}: {e}")

        database.workflows().update_contents(workflow.id, contents, data)
        database.workflows().update_status(workflow.id, WorkflowStatus.DOWNLOADED)
        log(f"  + {wf_path}")

    database.commit()


def parse_path_spec(spec):
    # "/abs/path" or "/abs/path:org/name"
    if ":" in spec:
        path, slug = spec.rsplit(":", 1)
        if "/" in slug and not slug.startswith("/"):
            org_name, repo_name = slug.split("/", 1)
            return path, org_name, repo_name
    return spec, None, None


def main():
    p = argparse.ArgumentParser(
        prog="butler-ingest-local",
        description="Populate a Butler SQLite DB from local repo checkouts.",
    )
    p.add_argument("--database", required=True, help="Path to SQLite DB (will be created if missing)")
    p.add_argument(
        "--path", action="append", required=True,
        help="Repo path; repeatable. Form: PATH or PATH:ORG/NAME",
    )
    args = p.parse_args()

    if not args.database.lower().endswith((".db", ".sqlite3")):
        print("--database must end with .db or .sqlite3", file=sys.stderr)
        sys.exit(2)

    db = Database(args.database)
    for spec in args.path:
        path, org_name, repo_name = parse_path_spec(spec)
        if not os.path.isdir(path):
            print(f"skip: {path} is not a directory", file=sys.stderr)
            continue
        ingest_repo(db, path, org_name, repo_name, log=print)
    db.commit()
    print("done")


if __name__ == "__main__":
    main()
