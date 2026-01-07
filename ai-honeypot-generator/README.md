# AI Honeypot Generator

Automatically generates honeypot sites based on recent security vulnerabilities using AI and deploys them via GitHub Pages.

## Overview

This project uses GitHub Actions to:
1. Monitor for recent security vulnerabilities
2. Generate realistic fake vulnerable sites (honeypots) using AI
3. Deploy them to GitHub Pages
4. Log and track access attempts

## How It Works

1. **Weekly Scan**: GitHub Actions runs weekly to find recent CVEs
2. **AI Generation**: Uses an LLM to generate a convincing honeypot site
3. **Deployment**: Deploys to GitHub Pages automatically
4. **Logging**: Tracks visitor access patterns and attempts

## Current Honeypots

- **n8n CVE-2026-21858**: Critical RCE vulnerability (CVSS 10.0)

## Architecture

```
ai-honeypot-generator/
├── honeypots/          # Generated honeypot sites
├── scripts/            # Generator scripts
├── logs/              # Access logs
└── .github/workflows/ # GitHub Actions
```

## Security Note

These are FAKE vulnerable sites designed to attract and monitor attackers. They do not contain real vulnerabilities or sensitive data.
