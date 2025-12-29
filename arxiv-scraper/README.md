# ArXiv Paper Scraper

A daily curated feed of interesting AI and Cybersecurity research papers from arXiv.org, automatically updated via GitHub Actions and displayed on GitHub Pages.

## Features

- 🤖 **Automated Daily Updates**: GitHub Action runs daily to scrape new papers
- 📊 **Smart Selection**: Intelligently selects one interesting paper per day based on keywords and relevance
- 🎨 **Clean Interface**: Simple, responsive HTML page (no React, just vanilla JS)
- 📚 **Research Focus**: Covers AI (Machine Learning, Computer Vision, NLP) and Cybersecurity topics
- 📱 **Mobile Friendly**: Responsive design works on all devices

## How It Works

1. **GitHub Action** (`scrape-papers.yml`) runs daily at 9 AM UTC
2. **Python Script** (`scrape_arxiv.py`) fetches papers from arXiv API
3. Papers are filtered by categories: AI (cs.AI, cs.LG, cs.CL, cs.CV) and Security (cs.CR)
4. One interesting paper is selected based on keywords and scored
5. Selected paper is saved to `data/papers.json`
6. GitHub Pages displays the papers from the JSON file

## Setting Up GitHub Pages

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top right)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Source**: Deploy from a branch
   - **Branch**: Select your main branch (e.g., `main` or `master`)
   - **Folder**: Select `/arxiv-scraper` (or `/` if this is the root)
5. Click **Save**

### Step 2: Configure GitHub Pages Path

If `arxiv-scraper` is in a subdirectory:

1. After enabling Pages, note your site URL (e.g., `https://username.github.io/repo-name/`)
2. Your site will be accessible at: `https://username.github.io/repo-name/arxiv-scraper/`

### Step 3: Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

### Step 4: Run Initial Scrape

1. Go to **Actions** tab
2. Click on **Scrape ArXiv Papers** workflow
3. Click **Run workflow** button
4. Wait for the workflow to complete
5. Check that `data/papers.json` has been updated

### Step 5: Visit Your Site

After a few minutes, visit your GitHub Pages URL:
- If in subdirectory: `https://username.github.io/repo-name/arxiv-scraper/`
- If in root: `https://username.github.io/repo-name/`

## Manual Testing

You can run the scraper locally:

```bash
cd arxiv-scraper
python scripts/scrape_arxiv.py
```

Then open `index.html` in your browser to preview the page.

## Customization

### Change Update Frequency

Edit `.github/workflows/scrape-papers.yml`:

```yaml
schedule:
  - cron: '0 9 * * *'  # Change this cron expression
```

Examples:
- `'0 9 * * *'` - Daily at 9 AM UTC
- `'0 */6 * * *'` - Every 6 hours
- `'0 9 * * 1'` - Every Monday at 9 AM UTC

### Modify Search Categories

Edit `scripts/scrape_arxiv.py` and change the `SEARCH_QUERIES` list:

```python
SEARCH_QUERIES = [
    "cat:cs.AI",  # Artificial Intelligence
    "cat:cs.CR",  # Cryptography and Security
    # Add more categories as needed
]
```

### Adjust Paper Selection

Modify the `interesting_keywords` list in `select_interesting_paper()` function to change how papers are scored and selected.

## File Structure

```
arxiv-scraper/
├── .github/
│   └── workflows/
│       └── scrape-papers.yml    # GitHub Action workflow
├── data/
│   └── papers.json              # Stored papers data
├── scripts/
│   └── scrape_arxiv.py          # Scraper script
├── index.html                   # Main page
├── styles.css                   # Styling
└── README.md                    # This file
```

## Troubleshooting

### Papers not updating?

1. Check the **Actions** tab for failed workflow runs
2. Verify **Workflow permissions** are set to "Read and write"
3. Check that the scraper script has no errors

### Page not displaying?

1. Ensure GitHub Pages is enabled and configured correctly
2. Check browser console for JavaScript errors
3. Verify `data/papers.json` exists and contains valid JSON

### Want to test locally?

Run the scraper and use a local server:

```bash
python scripts/scrape_arxiv.py
python -m http.server 8000
```

Then visit `http://localhost:8000`

## Credits

Papers sourced from [arXiv.org](https://arxiv.org) using their public API.

## License

This project is open source and available for educational purposes.
