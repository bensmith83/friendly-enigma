# Honeypot Logs

This directory contains logs and analysis from honeypot activity.

## Log Files

- `recent-cves.json` - List of recently discovered CVEs that could be turned into honeypots
- `access-logs/` - Access logs from honeypots (when logging is configured)
- `analysis/` - Analysis reports and statistics

## Logging Status

⚠️ **Logging is not yet configured.** See `../LOGGING.md` for setup instructions.

To enable logging, choose one of the following options:
1. Cloudflare Workers (recommended)
2. GitHub Issues API
3. Google Analytics 4
4. External webhook service

## Log Format

When configured, logs will follow this schema:

```json
{
  "timestamp": "2026-01-07T10:30:00Z",
  "eventType": "page_view",
  "cve": "CVE-2026-21858",
  "userAgent": "Mozilla/5.0...",
  "language": "en-US",
  "platform": "Linux x86_64",
  "screenResolution": "1920x1080",
  "timezone": "America/New_York",
  "referrer": "https://google.com",
  "ip": "xxx.xxx.xxx.xxx",
  "additionalData": {}
}
```

## Privacy Notice

All honeypot access is logged for security research purposes. Logged data includes:
- Timestamp
- User agent
- Browser metadata
- Interaction events

**No personally identifiable information (PII) is intentionally collected beyond what's necessary for security research.**

## Analysis

Run analysis scripts to generate reports:

```bash
npm run analyze-logs
```

This will generate:
- Access frequency charts
- Geographic distribution
- Common attack patterns
- Time-series analysis
