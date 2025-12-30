# ALS Research Aggregator - Implementation Plan

## Overview

Build a web application that automatically aggregates ALS-related news, research, and local resources, categorizes them using Claude AI, and publishes a weekly digest to GitHub Pages. This mirrors the workflow your friend currently does manually with Google's Deep Research.

## User's Current Workflow (to replicate)

**Prompt used:**
> "find news in the past week related to ALS and sort into categories, for example: research, treatment, cure, grants, assistance, local programs/volunteer opportunities/charities (New Jersey state generally, New Brunswick, NJ area specifically)"

**Output example:** https://gemini.google.com/share/c801647aa988

**Future goal:** Monthly bullet-point summary of biggest news

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Weekly)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Fetch News Sources                                           │
│     ├── NewsAPI.org (general ALS news)                          │
│     ├── PubMed API (research papers)                            │
│     ├── Google News RSS (backup/additional)                     │
│     └── Local NJ sources (targeted search)                      │
│                                                                  │
│  2. Process with Claude API                                      │
│     ├── Deduplicate articles                                     │
│     ├── Categorize into buckets                                  │
│     ├── Generate summaries                                       │
│     └── Rank by importance                                       │
│                                                                  │
│  3. Generate Output                                              │
│     ├── JSON data file (digests.json)                           │
│     └── Commit & push to repo                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Pages (Static Site)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  index.html                                                      │
│  ├── Latest digest prominently displayed                        │
│  ├── Categories with expandable sections                        │
│  ├── Links to original sources                                  │
│  └── Archive of past digests                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Categories (from user's prompt)

1. **Research** - Scientific studies, clinical trials, lab discoveries
2. **Treatment** - FDA approvals, therapies, symptom management
3. **Cure** - Breakthrough potential, experimental approaches
4. **Grants** - Funding opportunities, research grants
5. **Assistance** - Patient support, caregiver resources, financial aid
6. **Local (NJ/New Brunswick)** - Local events, support groups, charities, volunteer opportunities

---

## Data Sources

### 1. NewsAPI.org (Primary - General News)
- **Free tier:** 100 requests/day, 1 month of articles
- **Query:** `"ALS" OR "amyotrophic lateral sclerosis" OR "Lou Gehrig's disease"`
- **Pros:** Clean API, good coverage, easy to use
- **Cons:** Requires API key, rate limited

### 2. PubMed/NCBI E-utilities (Research Papers)
- **Free:** Unlimited with email registration
- **Query:** ALS[Title/Abstract] with date filters
- **Pros:** Authoritative research source, free
- **Cons:** Academic-focused, less "news" coverage

### 3. Google News RSS (Backup/Supplemental)
- **Free:** No API key needed
- **Query:** RSS feed parsing for ALS news
- **Pros:** No rate limits, fresh content
- **Cons:** Less structured, may need more filtering

### 4. ALS Association / Local Sources (Targeted)
- Direct scraping of ALS Association news
- NJ-specific health department announcements
- Robert Wood Johnson University Hospital (New Brunswick)

---

## Technical Implementation

### File Structure
```
als-research-aggregator/
├── index.html           # Main webpage
├── styles.css           # Styling
├── script.js            # Client-side rendering
├── scripts/
│   ├── aggregate.py     # Main aggregation script
│   ├── sources/
│   │   ├── newsapi.py   # NewsAPI fetcher
│   │   ├── pubmed.py    # PubMed fetcher
│   │   └── rss.py       # RSS/Google News fetcher
│   └── requirements.txt # Python dependencies
├── data/
│   └── digests.json     # Stored digests
└── README.md            # Documentation
```

### GitHub Actions Workflow
```yaml
name: ALS Research Aggregator

on:
  schedule:
    - cron: '0 8 * * 0'  # Weekly on Sunday at 8 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - Checkout repo
      - Setup Python 3.11
      - Install dependencies
      - Run aggregation script (with API keys from secrets)
      - Commit and push data/digests.json
```

### Required GitHub Secrets
- `ANTHROPIC_API_KEY` - Already available (user confirmed)
- `NEWSAPI_KEY` - Free tier at newsapi.org (optional but recommended)

---

## Claude API Integration

### Prompt Strategy

**Step 1: Article Processing**
For each batch of articles, Claude will:
1. Remove duplicates (same story from multiple sources)
2. Categorize into the 6 categories
3. Generate a 2-3 sentence summary
4. Identify if NJ/New Brunswick specific

**Step 2: Digest Generation**
Claude will create a structured weekly digest with:
- Key highlights (3-5 most important items)
- Category-organized articles
- Brief editorial summary

### Cost Estimate
- Using Claude 3 Haiku for cost efficiency
- ~50-100 articles/week × ~500 tokens each = ~50K tokens
- Estimated cost: ~$0.01-0.02/week

---

## Frontend Design

### Main Page Features
1. **Latest Digest** - Hero section with this week's summary
2. **Category Tabs** - Filter by Research, Treatment, Local, etc.
3. **Article Cards** - Title, source, date, summary, link
4. **Archive** - Dropdown to view past weeks
5. **Search** - Filter within current/all digests

### Mobile-Friendly
- Responsive design
- Collapsible category sections
- Easy-to-tap article links

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create folder structure
- [ ] Set up NewsAPI fetcher
- [ ] Set up PubMed fetcher
- [ ] Create Claude integration for categorization
- [ ] Generate first test digest
- [ ] Create basic index.html

### Phase 2: Full Pipeline
- [ ] Add RSS/Google News fetcher
- [ ] Implement deduplication logic
- [ ] Create GitHub Actions workflow
- [ ] Add to deploy-pages.yml
- [ ] Test end-to-end

### Phase 3: Polish
- [ ] Improve UI/UX
- [ ] Add archive navigation
- [ ] Add search/filter functionality
- [ ] Add NJ-specific source monitoring

### Phase 4: Future Enhancements (Optional)
- [ ] Monthly highlights summary
- [ ] Email notification integration
- [ ] RSS feed output for the digest itself

---

## Questions for User

1. **Frequency:** Weekly (Sundays) works? Or prefer a different day?

2. **NewsAPI Key:** Are you okay signing up for a free NewsAPI.org account? (100 requests/day free, takes 2 minutes). Alternatively, we can rely on free sources only (PubMed + RSS), though coverage would be slightly less comprehensive.

3. **Priority sources:** Any specific sources your friend particularly trusts or wants prioritized? (e.g., ALS Association, certain hospitals, specific researchers)

4. **Archive depth:** How many weeks of history should we keep visible? (I'd suggest 12 weeks / 3 months)

5. **Any additional categories** beyond: Research, Treatment, Cure, Grants, Assistance, Local?

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| NewsAPI rate limits | Use caching, combine with free sources |
| API costs | Use Haiku model, batch processing |
| Low-quality results | Claude filtering + source prioritization |
| Missing local news | Add NJ-specific RSS feeds |

---

## Ready to Implement

Once you approve this plan (and answer the questions above), I'll implement the full solution. The core functionality can be working within a single session.
