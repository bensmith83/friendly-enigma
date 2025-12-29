---
title: "Quick Tip: Git Commit Message Template"
date: 2025-12-27 09:00:00 -0000
tags: [git, productivity, tips]
---

I recently started using a git commit message template and it's improved my commit quality significantly.

Create a file `~/.gitmessage`:

```
# <type>: <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, test, chore
# Subject: imperative mood, no period, max 50 chars
# Body: what and why, not how, wrap at 72 chars
# Footer: reference issues, breaking changes
```

Then configure git to use it:

```bash
git config --global commit.template ~/.gitmessage
```

Now every time you commit, you get these helpful reminders. The commented lines guide you without forcing a specific format.

The most valuable part for me is the imperative mood reminder. Instead of "Fixed bug" or "Fixes bug", write "Fix bug" - as if giving a command to the codebase.

Small improvement, but it compounds over time.
