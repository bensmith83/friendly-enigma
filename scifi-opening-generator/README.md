# Sci-Fi Opening Generator

A web app that displays compelling sci-fi story openings and endings, inspired by Nebula and Hugo award-winning novels and novellas.

## Features

- **Random Content**: Each refresh shows a new opening or ending page
- **Dual Modes**: Switch between "Opening Page" and "Ending Page" styles
- **Cached Content**: Pre-generated content for instant loading
- **Client-side Caching**: Browser caches data for 24 hours to reduce network requests
- **History Tracking**: Avoids showing recently-viewed content
- **Keyboard Shortcuts**: `O` for opening, `E` for ending, `Space/R` for refresh

## How It Works

### Architecture

1. **Content Generation** (GitHub Actions)
   - Runs weekly via scheduled workflow
   - Uses Hugging Face Inference API (free tier) or OpenAI
   - Generates 5 new openings and 5 new endings per run
   - Caches up to 50 of each type

2. **Web Frontend**
   - Pure HTML/CSS/JS (no frameworks)
   - Fetches cached content from `data/openings.json`
   - Browser localStorage caches data for 24 hours
   - Tracks viewing history to avoid repetition

### Award-Winning Inspiration

Content is inspired by 80+ Nebula and Hugo award-winning novels and novellas, including:

- *Dune* by Frank Herbert
- *The Left Hand of Darkness* by Ursula K. Le Guin
- *Neuromancer* by William Gibson
- *Ender's Game* by Orson Scott Card
- *The Fifth Season* by N.K. Jemisin
- *Ancillary Justice* by Ann Leckie
- *A Memory Called Empire* by Arkady Martine
- And many more...

## Setup

### API Key Configuration

The content generation script supports two LLM providers:

#### Option 1: Hugging Face (Free Tier)

1. Create a free account at [huggingface.co](https://huggingface.co)
2. Generate an access token at Settings → Access Tokens
3. Add the token as a GitHub Secret:
   - Go to repo Settings → Secrets and variables → Actions
   - Add new secret: `HF_TOKEN` = your token

#### Option 2: OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add as GitHub Secret: `OPENAI_API_KEY` = your key

### Manual Content Generation

To generate content locally:

```bash
cd scifi-opening-generator/scripts
export HF_TOKEN="your-token-here"  # or OPENAI_API_KEY
python generate_openings.py
```

### Running Locally

Simply serve the directory with any static file server:

```bash
cd scifi-opening-generator
python -m http.server 8000
# Visit http://localhost:8000
```

## API Usage Limits

The system is designed to minimize API costs:

| Control | Setting |
|---------|---------|
| Generation frequency | Weekly (Sundays 2AM UTC) |
| Items per generation | 5 openings + 5 endings |
| Maximum cache size | 50 openings + 50 endings |
| Client cache duration | 24 hours |

## File Structure

```
scifi-opening-generator/
├── index.html          # Main web page
├── styles.css          # Styling (sci-fi theme)
├── script.js           # Frontend logic with caching
├── data/
│   └── openings.json   # Cached generated content
├── scripts/
│   └── generate_openings.py  # Content generation script
└── README.md
```

## Customization

### Adjust Generation Frequency

Edit `.github/workflows/generate-scifi.yml`:

```yaml
schedule:
  - cron: '0 2 * * 0'  # Currently: Sundays at 2AM UTC
  # Daily: '0 2 * * *'
  # Every 3 days: '0 2 */3 * *'
```

### Add More Source Novels

Edit `scripts/generate_openings.py` and add to the `AWARD_WINNING_WORKS` list:

```python
{"title": "New Novel", "author": "Author Name", "year": 2024},
```

### Adjust Cache Limits

In `generate_openings.py`:
- `num_to_generate`: Items per run (default: 5)
- `max_cache_size`: Maximum cached items (default: 50)

## Security

- API keys stored as GitHub Secrets (never in code)
- Content Security Policy headers prevent XSS
- No external dependencies for CSS/JS
- All content pre-generated (no client-side API calls)
