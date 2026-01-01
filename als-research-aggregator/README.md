# ALS Research Aggregator

Automated weekly aggregation of ALS (Amyotrophic Lateral Sclerosis) news, research, and resources with a special focus on New Jersey and the New Brunswick area.

## Features

- **Weekly automated updates** via GitHub Actions (runs every Sunday)
- **Multiple sources**: NewsAPI, PubMed research papers, RSS feeds (including Google News)
- **AI-powered categorization** using Claude to organize and summarize articles
- **Six categories**: Research, Treatment, Cure, Grants, Assistance, Local (NJ)
- **Update tracking**: Links to related articles from previous weeks
- **Full source attribution**: Every summary includes source links and a references section

## How It Works

1. **Fetch**: GitHub Actions runs weekly to gather ALS news from multiple sources
2. **Process**: Claude AI categorizes articles and generates summaries
3. **Publish**: Results are saved to `data/digests.json` and displayed on GitHub Pages

## Setup

### Required GitHub Secrets

1. `ANTHROPIC_API_KEY` - Your Claude API key (required)
2. `NEWSAPI_KEY` - NewsAPI.org API key (optional but recommended for broader coverage)

### Getting API Keys

- **Anthropic**: https://console.anthropic.com/
- **NewsAPI**: https://newsapi.org/ (free tier: 100 requests/day)

## Local Development

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export NEWSAPI_KEY="your-key"  # optional

# Run aggregator
cd scripts
python aggregate.py
```

## Categories

| Category | Description |
|----------|-------------|
| Research | Scientific studies, clinical trials, lab discoveries |
| Treatment | FDA approvals, therapies, symptom management |
| Cure | Breakthrough potential, experimental approaches |
| Grants | Funding opportunities, research grants |
| Assistance | Patient support, caregiver resources, financial aid |
| Local | New Jersey events, support groups, charities, volunteer opportunities |

## File Structure

```
als-research-aggregator/
├── index.html           # Web interface
├── styles.css           # Styling
├── script.js            # Client-side rendering
├── scripts/
│   ├── aggregate.py     # Main aggregation script
│   ├── requirements.txt # Python dependencies
│   └── sources/
│       ├── newsapi.py   # NewsAPI fetcher
│       ├── pubmed.py    # PubMed fetcher
│       └── rss.py       # RSS/Google News fetcher
├── data/
│   └── digests.json     # Stored weekly digests
├── PLAN.md              # Implementation plan
└── README.md            # This file
```

## Resources

- [ALS Association](https://www.als.org/)
- [NIH ALS Information](https://www.ninds.nih.gov/health-information/disorders/amyotrophic-lateral-sclerosis-als)
- [PubMed ALS Research](https://pubmed.ncbi.nlm.nih.gov/?term=amyotrophic+lateral+sclerosis)

## Disclaimer

This tool aggregates and summarizes publicly available information. Always verify information with healthcare providers. This is not medical advice.
