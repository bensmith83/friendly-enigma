# Setup Guide for AI Honeypot Generator

## Quick Start

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - The workflow will automatically deploy to Pages

2. **Configure GitHub Actions**
   - The workflow is already set up in `.github/workflows/generate-honeypots.yml`
   - It runs weekly on Mondays at 9 AM UTC
   - You can also trigger it manually from the Actions tab

3. **Optional: Configure Logging**
   - See `LOGGING.md` for detailed logging setup
   - Recommended: Cloudflare Workers for free, scalable logging

## Manual Generation

To manually generate a honeypot:

```bash
cd ai-honeypot-generator
npm install
node scripts/generate-honeypot.js CVE-2026-21858
```

## Project Structure

```
ai-honeypot-generator/
├── .github/workflows/
│   └── generate-honeypots.yml    # Automated generation workflow
├── honeypots/                     # Generated honeypot sites
│   ├── index.html                # Main landing page
│   └── CVE-2026-21858/           # Individual honeypot
│       ├── index.html            # Honeypot site
│       ├── metadata.json         # CVE metadata
│       └── README.md             # CVE details
├── scripts/
│   ├── generate-honeypot.js      # Generator script
│   └── find-vulnerabilities.js   # CVE finder
├── logs/                          # Logs directory
│   └── recent-cves.json          # Found CVEs
├── package.json
├── README.md
├── SETUP.md                       # This file
└── LOGGING.md                     # Logging setup guide
```

## How It Works

### 1. CVE Discovery
- GitHub Actions runs weekly
- Searches for recent high-severity CVEs
- Filters for web applications
- Saves to `logs/recent-cves.json`

### 2. Honeypot Generation
- Takes CVE information as input
- Generates realistic fake vulnerable site
- Includes tracking JavaScript
- Creates metadata and documentation

### 3. Deployment
- Commits generated files to repository
- GitHub Actions deploys to GitHub Pages
- Site is accessible at `https://[username].github.io/[repo]/ai-honeypot-generator/honeypots/`

### 4. Logging
- JavaScript in honeypot tracks:
  - Page views
  - Form submissions
  - DevTools opening
  - File paste attempts
- Logs can be sent to external service (see LOGGING.md)

## Adding New CVEs

### Automatic (Recommended)
1. Wait for weekly workflow run
2. Check Actions tab for results
3. New honeypots are automatically generated and deployed

### Manual
1. Add CVE to `scripts/generate-honeypot.js` in `CVE_DATABASE`
2. Run: `npm run generate -- CVE-ID`
3. Commit and push changes
4. GitHub Actions will deploy

### Example CVE Entry
```javascript
'CVE-2026-XXXXX': {
  id: 'CVE-2026-XXXXX',
  title: 'Product Name Vulnerability Type',
  cvss: 9.8,
  description: 'Brief description',
  affectedProduct: 'product-name',
  affectedVersions: '<= 1.0.0',
  fixedVersion: '1.0.1',
  discoveryDate: '2026-01-07',
  vulnerability: 'Technical details',
  impact: 'Impact description',
  references: [
    'https://example.com/advisory'
  ]
}
```

## Customization

### Modify Honeypot Appearance
Edit `scripts/generate-honeypot.js` → `generateHoneypotHTML()` function

### Change Update Frequency
Edit `.github/workflows/generate-honeypots.yml` → `schedule` section

### Add Custom Logging
See `LOGGING.md` for integration options

## Security Considerations

### Ethical Use
✅ **DO:**
- Use for security research
- Use for threat intelligence
- Clearly label as honeypots
- Log only necessary data

❌ **DON'T:**
- Use to attack real systems
- Collect PII unnecessarily
- Hide that it's a honeypot
- Use for malicious purposes

### Privacy
- Honeypots clearly indicate they're for research
- Only security-relevant data is logged
- No authentication or real data collected
- Compliant with security research ethics

## Troubleshooting

### GitHub Actions Fails
- Check Actions tab for error logs
- Ensure repository has Pages enabled
- Verify workflow permissions (Settings → Actions → Workflow permissions)

### Honeypot Not Deploying
- Check that Pages source is set to "GitHub Actions"
- Verify artifacts are being created in workflow
- Check deployment logs in Actions tab

### Logging Not Working
- Verify external service is configured
- Check browser console for errors
- Test with simple console.log first

## Next Steps

1. **Enable GitHub Pages** (if not already done)
2. **Run first workflow** (Actions → Generate Honeypots → Run workflow)
3. **Set up logging** (optional, see LOGGING.md)
4. **Monitor access** (check configured logging service)
5. **Analyze patterns** (weekly review of honeypot activity)

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NVD API Documentation](https://nvd.nist.gov/developers/vulnerabilities)
- [Honeypot Best Practices](https://www.sans.org/white-papers/36240/)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review GitHub Actions logs
3. Check LOGGING.md for logging issues
4. Open an issue in the repository
