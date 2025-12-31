# Cloudflare Worker Deployment Guide

This guide walks you through deploying the Weird Science Fact Generator API proxy to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Free tier is sufficient
2. **Claude API Key**: Get one from https://console.anthropic.com/
3. **Node.js**: Version 16.13.0 or higher
4. **npm or yarn**: For package management

## Step 1: Install Wrangler CLI

Wrangler is Cloudflare's CLI tool for managing Workers.

```bash
npm install -g wrangler
# or
yarn global add wrangler
```

## Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to log in to your Cloudflare account.

## Step 3: Get Your Account ID

1. Go to https://dash.cloudflare.com/
2. Click on "Workers & Pages" in the sidebar
3. Copy your Account ID from the right sidebar
4. Update `wrangler.toml` with your account ID

## Step 4: Configure the Worker

Edit `wrangler.toml`:

```toml
account_id = "YOUR_ACCOUNT_ID_HERE"
```

## Step 5: Set Claude API Key as Secret

**IMPORTANT**: Never commit your API key to version control!

```bash
wrangler secret put CLAUDE_API_KEY
```

When prompted, paste your Claude API key.

## Step 6: Update Allowed Origins

Edit `worker.js` and update the `ALLOWED_ORIGINS` array:

```javascript
ALLOWED_ORIGINS: [
    'https://YOUR-USERNAME.github.io',
    'http://localhost:3000' // For local development
]
```

## Step 7: Deploy the Worker

```bash
# Install dependencies
npm install

# Deploy to production
npm run deploy
```

The output will show your Worker URL, e.g.:
```
Published weird-science-fact-api (1.23 sec)
  https://weird-science-fact-api.YOUR-SUBDOMAIN.workers.dev
```

## Step 8: Update Frontend Configuration

Copy the Worker URL and update `script.js` in the main project:

```javascript
const CONFIG = {
    apiEndpoint: 'https://weird-science-fact-api.YOUR-SUBDOMAIN.workers.dev',
    // ... rest of config
};
```

## Step 9: Test the Deployment

```bash
# Test locally first
npm run dev

# In another terminal, test the endpoints:
curl -X POST https://weird-science-fact-api.YOUR-SUBDOMAIN.workers.dev/generate-fact
```

## Advanced Configuration

### Enable KV-based Rate Limiting (Recommended for Production)

1. Create a KV namespace:
   ```bash
   wrangler kv:namespace create "RATE_LIMIT_KV"
   ```

2. Update `wrangler.toml` with the namespace ID

3. Update `worker.js` to use KV instead of in-memory storage

### Monitor Your Worker

```bash
# View real-time logs
npm run tail

# View analytics in dashboard
wrangler dashboard
```

### Custom Domain (Optional)

1. Add a custom domain in Cloudflare Dashboard
2. Update `wrangler.toml` route configuration
3. Redeploy with `npm run deploy`

## Security Best Practices

✅ **DO**:
- Store API keys as secrets (never in code)
- Use CORS to restrict allowed origins
- Implement rate limiting
- Monitor usage and costs
- Keep dependencies updated

❌ **DON'T**:
- Commit API keys to version control
- Allow unlimited requests
- Skip input sanitization
- Ignore error logs

## Troubleshooting

### Error: "API key not configured"
- Make sure you ran `wrangler secret put CLAUDE_API_KEY`
- Check that the secret name matches the code

### Error: "Forbidden" or CORS errors
- Verify `ALLOWED_ORIGINS` includes your GitHub Pages URL
- Check that CORS headers are set correctly

### Error: "Rate limit exceeded"
- Wait for the rate limit window to expire
- Adjust rate limits in CONFIG if needed

### Worker not updating after deployment
- Check Cloudflare dashboard for deployment status
- Clear browser cache
- Wait 30-60 seconds for global propagation

## Cost Estimation

Cloudflare Workers Free Tier:
- 100,000 requests per day
- No charge for first 100,000 requests

With 5 requests/hour/user rate limit:
- ~120 requests per user per day maximum
- Free tier supports ~800 active users per day

Claude API costs (as of 2024):
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Estimated: ~$0.01-0.02 per complete fact generation (3 API calls)
- With rate limiting: Max ~$0.50-1.00 per user per day

## Updates and Maintenance

To update the Worker:

```bash
# Make changes to worker.js
# Then deploy
npm run deploy
```

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Anthropic API Docs: https://docs.anthropic.com/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/

## Next Steps

After deployment:
1. Test all three endpoints thoroughly
2. Monitor initial usage and costs
3. Adjust rate limits if needed
4. Consider adding analytics
5. Set up alerts for high usage
