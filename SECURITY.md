# Security Policy

## Supported Versions

This blog is built with Jekyll and GitHub Pages. We keep dependencies up to date through Dependabot.

| Component | Version | Supported |
| --------- | ------- | --------- |
| Jekyll | Latest via github-pages gem | ✅ |
| Ruby | 3.2+ | ✅ |

## Security Features

This blog implements several security best practices:

### Content Security Policy (CSP)
- Strict CSP headers configured in the HTML layout
- No inline scripts (only external, versioned scripts)
- No external dependencies for CSS/JS

### Dependency Management
- Dependabot enabled for automatic security updates
- Minimal dependencies (only Jekyll and official GitHub Pages gems)
- Regular automated updates

### Secure Coding Practices
- No user input handling (static site)
- All external links open with `rel="noopener noreferrer"`
- No external JavaScript dependencies
- No tracking or analytics scripts

### HTTPS
- Enforced by GitHub Pages
- All resources loaded over HTTPS

## Reporting a Vulnerability

If you discover a security vulnerability in this blog, please report it by:

1. **Email**: [your.email@example.com]
2. **GitHub Security Advisory**: Use the "Security" tab to create a private security advisory

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 1 week
- **Fix Timeline**: Depends on severity
  - Critical: Within 24 hours
  - High: Within 1 week
  - Medium: Within 1 month
  - Low: Next regular update

## Security Updates

We monitor security advisories for:
- Ruby and gems
- Jekyll and plugins
- GitHub Actions

All security updates are applied promptly through automated Dependabot PRs.
