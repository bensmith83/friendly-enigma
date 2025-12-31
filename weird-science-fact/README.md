# 🧪 Weird Science Fact Generator

An AI-powered web application that displays bizarre science facts that have been AI-generated, fact-checked, and illustrated. Built with security, cost control, and user experience as top priorities.

## ✨ Features

- **Pre-Generated Cache**: Facts generated weekly via GitHub Actions, served instantly
- **Multi-Stage AI Pipeline**: Each fact goes through generation → verification → description → SVG artwork
- **Independent Fact-Checking**: Separate AI judge verifies each fact
- **AI-Generated SVG Artwork**: Claude creates unique SVG illustrations for every fact (no external image API needed!)
- **Zero Setup Required**: Works entirely on GitHub Pages, no external services needed
- **Predictable Costs**: All API calls happen during scheduled builds, not user visits (~$2-4/month)
- **Security First**: Multiple layers of protection against common vulnerabilities

## 🏗️ Architecture (Much Simpler!)

```
┌──────────────────┐
│  GitHub Actions  │  Weekly scheduled job
│  (Fact Generator)│  - Generates 50 facts
└────────┬─────────┘  - Fact-checks each
         │            - Creates descriptions
         │            - Saves to data/facts.json
         ▼
┌──────────────────┐
│  GitHub Pages    │  Static hosting
│  (Frontend)      │  - Loads facts instantly
└──────────────────┘  - No API calls
                      - Zero cost to users
```

**Benefits of This Approach:**
- ✅ No Cloudflare/Vercel/AWS setup needed
- ✅ API costs only during scheduled builds
- ✅ Instant page loads (cached facts)
- ✅ Global rate limiting built-in (50 facts max)
- ✅ Works 100% on GitHub infrastructure

## 🚀 Setup Instructions

### Step 1: Add Claude API Key to GitHub Secrets

✅ **Already configured!** Your repository already has `ANTHROPIC_API_KEY` set, which the workflow uses automatically.

If you need to update it:
1. Go to your repository settings
2. Navigate to **Secrets and variables → Actions**
3. Update the existing `ANTHROPIC_API_KEY` secret

### Step 2: Enable GitHub Actions

The workflow is already configured! It will:
- Run automatically every Sunday at 2 AM UTC
- Generate 50 verified science facts
- Update `data/facts.json`
- Commit changes back to the repository

**Manual trigger:**
- Go to **Actions** tab
- Select "Generate Science Facts"
- Click "Run workflow"
- Optionally specify number of facts (default: 50)

### Step 3: Deploy to GitHub Pages

Already configured! The main `deploy-pages.yml` workflow will automatically deploy when you push to `main`.

### That's It!

No other setup required. No Cloudflare, no Vercel, no external services.

## 💰 Cost Analysis

### Predictable and Minimal

**Weekly Generation (50 facts):**
- 50 facts × 4 API calls each = 200 API calls
  - Call 1: Generate fact (~100 tokens)
  - Call 2: Verify fact (~300 tokens)
  - Call 3: Image description (~300 tokens)
  - Call 4: SVG artwork (~2000 tokens for SVG code)
- Using **Claude 3 Haiku** (fast & affordable)
- Estimated tokens: ~45,000 input + ~15,000 output
- Cost per week: **~$0.25-0.50** 🎉
- Cost per month: **~$1-2** 🎉
- Cost per year: **~$12-24** 🎉

**User Visits:**
- Cost: **$0** (facts served from static cache)
- No per-user charges
- No surprise bills
- Works offline after first load

### Cost Control Features

✅ **Limited Cache Size**: Max 50 facts prevents runaway generation
✅ **Scheduled Generation**: Only runs weekly, not on demand
✅ **Fact Verification**: Failed facts don't consume image generation costs
✅ **Retry Limits**: Max 3 retries per API call
✅ **GitHub Actions Limits**: Free tier includes 2,000 minutes/month

## 🔒 Security Features

### API Key Protection
- API key stored as GitHub Secret
- Never exposed to browser or frontend code
- Only accessible during GitHub Actions runs
- Environment variable access only

### Prompt Injection Prevention
- Structured prompts (no user input)
- Separate contexts for generation and verification
- Input sanitization in generator script
- Length limits on all LLM outputs

### Frontend Security
- Content Security Policy headers
- HTML escaping before display
- No inline scripts or styles
- CORS not needed (static files only)

### Supply Chain Security
- Minimal dependencies (@anthropic-ai/sdk only)
- Dependabot enabled for updates
- No CDN dependencies
- All code in version control

## 📊 How It Works

### Weekly Fact Generation (GitHub Actions)

```bash
# The workflow runs: scripts/generate-facts.js

For each fact (up to 50):
  1. Generate weird science fact (Claude API)
  2. Fact-check independently (Claude API)
  3. If verified:
     - Generate image description (Claude API)
     - Generate SVG artwork (Claude API)
     - Add to facts array with SVG code
  4. If not verified:
     - Skip and try next fact

Save all verified facts to data/facts.json
Commit and push to repository
```

### User Experience (Frontend)

```javascript
1. Page loads
2. Fetch data/facts.json (instant from cache)
3. Display random fact
4. User clicks "Next Weird Fact"
5. Show different random fact from cache
6. Avoid recently shown facts (history tracking)
7. When all facts seen, reset history
```

## 🔧 Customization

### Adjust Generation Schedule

Edit `.github/workflows/generate-science-facts.yml`:

```yaml
schedule:
  # Daily at 3 AM
  - cron: '0 3 * * *'

  # Every Monday at 8 AM
  - cron: '0 8 * * 1'

  # Twice weekly (Monday and Thursday)
  - cron: '0 8 * * 1,4'
```

### Change Fact Count

Edit the workflow file or use manual trigger with custom count:
- Actions → Generate Science Facts → Run workflow
- Enter desired count (e.g., 100)

### Modify AI Prompts

Edit `scripts/generate-facts.js`:
- `generateFact()` - Adjust fact generation style
- `verifyFact()` - Modify fact-checking criteria
- `generateImageDescription()` - Change description style

### Customize Frontend

Edit `script.js`:
- `CONFIG.historySize` - How many facts to remember
- `CONFIG.cacheExpiry` - How long to cache data

## 🎨 SVG Artwork Generation

**Already included!** Each fact comes with custom SVG artwork generated by Claude. No external image API needed!

Claude generates creative SVG illustrations based on the fact description, creating unique visual representations using shapes, gradients, and colors.

### Want Raster Images Instead?

If you prefer PNG/JPG images instead of SVG, you can integrate an external image API:

### Option 1: Generate During GitHub Actions

Add image generation to `scripts/generate-facts.js`:

```javascript
async function generateImage(description) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: description,
            n: 1,
            size: "1024x1024"
        })
    });

    const data = await response.json();
    return data.data[0].url; // Or download and commit image
}
```

### Option 2: Use Stable Diffusion or Other APIs

Similar integration - generate during Actions, save URLs or download images to repository.

## 🐛 Troubleshooting

### Facts not generating

1. Check GitHub Actions tab for workflow runs
2. Verify `ANTHROPIC_API_KEY` secret is set
3. Check workflow logs for errors
4. Ensure you have Claude API credits

### Old facts showing

- Clear browser localStorage
- Or wait 24 hours for cache expiry
- Or force refresh (Ctrl+F5)

### Workflow failing

Common issues:
- API key not set or expired
- API rate limits hit
- Node.js dependency issues

Check workflow logs for specific error messages.

## 📚 File Structure

```
weird-science-fact/
├── index.html              # Frontend HTML
├── styles.css              # Responsive CSS with animations
├── script.js               # Frontend JavaScript
├── data/
│   └── facts.json          # Generated facts cache
├── scripts/
│   ├── generate-facts.js   # Fact generation script
│   └── package.json        # Node.js dependencies
└── README.md               # This file
```

## 🤝 Comparison: Before vs After

### Before (Cloudflare Worker Approach)
❌ Required Cloudflare account and setup
❌ Separate backend deployment
❌ Complex CORS configuration
❌ Per-user API costs
❌ Slow initial loads (API calls on demand)
❌ Rate limiting complexity

### After (Cached Approach)
✅ GitHub-only infrastructure
✅ No external services
✅ Simple configuration
✅ Zero per-user costs
✅ Instant loads (cached facts)
✅ Automatic global rate limiting

## 🎯 Future Enhancements

- [ ] Actual image generation integration
- [ ] Fact categories (biology, physics, etc.)
- [ ] Share facts on social media
- [ ] Fact history and favorites
- [ ] RSS feed of facts
- [ ] Dark/light mode toggle
- [ ] Multilingual support
- [ ] Accessibility improvements

## ⚠️ Disclaimer

AI-generated facts are for entertainment and educational purposes. While fact-checked by AI, they should not be considered authoritative scientific sources. Always verify important information through peer-reviewed sources.

## 📊 Workflow Schedule

The fact generator runs:
- **Automatically**: Every Sunday at 2 AM UTC
- **Manually**: Via GitHub Actions → Run workflow
- **On Demand**: Triggered after code changes (optional)

You can adjust this schedule in the workflow file.

## 💡 Tips

1. **First Time Setup**: Manually trigger the workflow to generate initial facts
2. **Cost Monitoring**: Check Claude API usage at https://console.anthropic.com/
3. **Debugging**: Use workflow logs to see generation progress
4. **Local Testing**: Run `ANTHROPIC_API_KEY=your_key node scripts/generate-facts.js` locally
5. **Cache Management**: Facts update automatically, no manual intervention needed

## 📝 License

MIT License - feel free to use and modify

## 🔗 Related Projects

- [Sci-Fi Opening Generator](../scifi-opening-generator/) - Similar caching approach
- [CVSS Converter](../cvss-converter/) - Pure frontend security tool
- [ArXiv Scraper](../arxiv-scraper/) - Research paper aggregation

---

Built with ❤️ using Claude Code
**No Cloudflare Required!** ✨
