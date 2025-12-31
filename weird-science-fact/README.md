# 🧪 Weird Science Fact Generator

An AI-powered web application that generates bizarre science facts, verifies them, and creates AI-generated illustrations. Built with security, cost control, and user experience as top priorities.

## ✨ Features

- **Multi-Stage AI Pipeline**: Three separate AI calls for generation, verification, and visualization
- **Fact-Checking**: Independent AI judge verifies each fact before displaying
- **AI-Generated Images**: Text-to-image generation for visual representation (placeholder included)
- **Rate Limiting**: Client and server-side rate limiting to control API costs
- **Security First**: Multiple layers of protection against common web vulnerabilities
- **Progressive UX**: Step-by-step visual feedback during the 15-30 second generation process
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🔒 Security Features

This project implements comprehensive security measures:

### Prevented Attacks

1. **LLM Jacking / Prompt Injection**
   - Structured API calls with predefined prompts
   - Input sanitization in the backend
   - No user-provided prompts
   - Separate fact-checking without original context

2. **API Key Exposure**
   - API keys stored only in Cloudflare Workers (serverless backend)
   - Never transmitted to client
   - Environment variables for key management

3. **Cross-Site Scripting (XSS)**
   - Content Security Policy (CSP) headers
   - HTML escaping before display
   - No inline scripts or styles

4. **Cross-Origin Resource Sharing (CORS)**
   - Whitelist of allowed origins
   - Proper CORS headers
   - Origin verification on backend

5. **Rate Limiting & DoS**
   - Client-side: 5 requests per hour per browser
   - Server-side: IP-based rate limiting
   - Cloudflare's built-in DDoS protection

6. **Data Validation**
   - Input length limits
   - Type checking
   - Sanitization of all user-provided data

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## 🏗️ Architecture

```
┌─────────────────┐
│  GitHub Pages   │  Static hosting (HTML/CSS/JS)
│   (Frontend)    │  Client-side rate limiting
└────────┬────────┘  Content sanitization
         │
         │ HTTPS
         ▼
┌─────────────────┐
│ Cloudflare      │  API proxy & security layer
│    Worker       │  Server-side rate limiting
│   (Backend)     │  API key protection
└────────┬────────┘  Input sanitization
         │
         │ HTTPS + API Key
         ▼
┌─────────────────┐
│  Claude API     │  AI fact generation
│                 │  AI fact verification
│                 │  Image description generation
└─────────────────┘
         │
         │ (Optional)
         ▼
┌─────────────────┐
│  Image Gen API  │  DALL-E / Stable Diffusion
│  (Future)       │  Text-to-image generation
└─────────────────┘
```

## 🚀 Setup Instructions

### Prerequisites

- Claude API key from [Anthropic Console](https://console.anthropic.com/)
- Cloudflare account (free tier works)
- Node.js 16+ (for deploying Cloudflare Worker)
- Git and GitHub account

### Step 1: Deploy Cloudflare Worker

See detailed instructions in [`cloudflare-worker/DEPLOYMENT.md`](./cloudflare-worker/DEPLOYMENT.md)

Quick version:
```bash
cd cloudflare-worker
npm install
wrangler login
wrangler secret put CLAUDE_API_KEY
npm run deploy
```

### Step 2: Configure Frontend

Update `script.js` with your Worker URL:

```javascript
const CONFIG = {
    apiEndpoint: 'https://weird-science-fact-api.YOUR-SUBDOMAIN.workers.dev',
    // ...
};
```

### Step 3: Deploy to GitHub Pages

The GitHub Actions workflow automatically deploys the site when you push to `main`.

1. Commit your changes
2. Push to `main` branch
3. Go to Settings → Pages → Source: GitHub Actions
4. Access at: `https://YOUR-USERNAME.github.io/friendly-enigma/weird-science-fact/`

### Step 4: Test

Visit your deployed site and click "Generate Weird Fact"

## 🎨 Adding Real Image Generation

The current implementation includes a placeholder for image generation. To add real images:

### Option 1: DALL-E (OpenAI)

```javascript
async function generateImage(fact) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: `Scientific illustration of: ${fact}`,
            n: 1,
            size: "1024x1024"
        })
    });

    const data = await response.json();
    return { imageUrl: data.data[0].url };
}
```

### Option 2: Stability AI

```javascript
async function generateImage(fact) {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text_prompts: [{ text: `Scientific illustration: ${fact}` }],
            cfg_scale: 7,
            steps: 30,
            samples: 1
        })
    });

    const data = await response.json();
    return { imageUrl: `data:image/png;base64,${data.artifacts[0].base64}` };
}
```

### Option 3: Replicate

```javascript
// See: https://replicate.com/stability-ai/sdxl
const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        version: "sdxl-model-version-id",
        input: { prompt: fact }
    })
});
```

## 📊 Cost Analysis

### Cloudflare Workers
- **Free Tier**: 100,000 requests/day
- **Paid**: $5/month for 10M requests
- **This App**: With rate limiting, free tier is sufficient for most uses

### Claude API (Sonnet 3.5)
- **Input**: $3 / 1M tokens
- **Output**: $15 / 1M tokens
- **Per Generation** (3 calls):
  - Fact generation: ~100 tokens in, ~50 tokens out = $0.0008
  - Fact checking: ~150 tokens in, ~100 tokens out = $0.0020
  - Image description: ~150 tokens in, ~50 tokens out = $0.0012
  - **Total per generation: ~$0.004** (less than half a cent)

### With Rate Limiting (5 req/hour/user)
- **Max cost per user per day**: 120 requests × $0.004 = **$0.48**
- **Realistic usage**: 5-10 requests/user/day = **$0.02-0.04**
- **100 users**: ~$2-4 per day = **$60-120/month**

### Cost Control Measures
✅ Client-side rate limiting (5/hour)
✅ Server-side rate limiting (IP-based)
✅ Request validation and rejection
✅ Cloudflare's free tier DDoS protection
✅ No long-context conversations (single-shot prompts)

## 🔧 Customization

### Adjust Rate Limits

In `script.js`:
```javascript
rateLimit: {
    maxRequests: 5,              // Requests per window
    timeWindow: 60 * 60 * 1000,  // Time window (ms)
}
```

In `cloudflare-worker/worker.js`:
```javascript
RATE_LIMIT: {
    MAX_REQUESTS: 5,
    WINDOW_MS: 60 * 60 * 1000
}
```

### Modify AI Behavior

Edit prompts in `worker.js`:
- `generateFact()` - Adjust fact generation style
- `verifyFact()` - Modify fact-checking criteria
- `generateImage()` - Change image description style

### Styling

Edit `styles.css`:
- CSS variables in `:root` for colors
- Responsive breakpoints in media queries
- Animation speeds and effects

## 🐛 Troubleshooting

### "Configuration needed" error
- Update `CONFIG.apiEndpoint` in `script.js` with your Worker URL

### "Rate limit exceeded"
- Wait for the time window to expire (shown in UI)
- Or adjust rate limits in both frontend and backend

### CORS errors
- Verify `ALLOWED_ORIGINS` in `worker.js` includes your GitHub Pages URL
- Check browser console for specific error messages

### "Claude API error"
- Verify API key is set correctly: `wrangler secret put CLAUDE_API_KEY`
- Check Claude API status: https://status.anthropic.com/
- Verify account has credits: https://console.anthropic.com/

### Images not showing
- Placeholder SVGs are shown by default
- Implement real image generation API (see "Adding Real Image Generation")

## 📚 Technical Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Backend**: Cloudflare Workers (serverless)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Hosting**: GitHub Pages (static files)
- **Deployment**: GitHub Actions

## 🤝 Contributing

Improvements welcome! Key areas:
- Enhanced rate limiting strategies
- Additional security measures
- Image generation integration
- Accessibility improvements
- Performance optimizations

## 📝 License

MIT License - feel free to use and modify

## 🔗 Related Projects

- [Sci-Fi Opening Generator](../scifi-opening-generator/) - Similar caching approach
- [CVSS Converter](../cvss-converter/) - Pure frontend security tool
- [ArXiv Scraper](../arxiv-scraper/) - Research paper aggregation

## ⚠️ Disclaimer

This is an educational project demonstrating:
- Secure API key management
- Rate limiting implementation
- Multi-step AI workflows
- Progressive UX patterns

AI-generated facts should not be considered authoritative scientific sources. Always verify important information through peer-reviewed sources.

## 📞 Support

Found a bug or have a question?
- Check existing issues in the main repository
- Review troubleshooting section above
- Check Cloudflare Workers logs: `wrangler tail`

## 🎯 Future Enhancements

- [ ] Real image generation API integration
- [ ] Fact categories (biology, physics, chemistry, etc.)
- [ ] Share facts on social media
- [ ] Fact history and favorites
- [ ] Enhanced KV-based rate limiting
- [ ] Analytics dashboard
- [ ] A/B testing for different prompts
- [ ] Multilingual support
- [ ] Accessibility audit and improvements
- [ ] Progressive Web App (PWA) features

---

Built with ❤️ and Claude Code
