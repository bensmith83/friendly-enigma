# GitHub Pages Deployment

This repository hosts multiple projects on GitHub Pages:

- **Blog** (`/blog/`) - Personal blog with Jekyll
- **ArXiv Scraper** (`/arxiv-scraper/`) - Daily curated AI and Cybersecurity papers

## How It Works

The `deploy-pages.yml` workflow automatically builds and deploys both projects:

1. **Blog**: Built with Jekyll and served at `/blog/`
2. **ArXiv Scraper**: Static site served at `/arxiv-scraper/`
3. **Landing Page**: Root (`/`) shows a navigation page to both projects

## Deployment Triggers

The site is automatically deployed when:
- Changes are pushed to `main` branch in either `blog/` or `arxiv-scraper/` folders
- Manually triggered via workflow dispatch

## URLs

Once deployed:
- Landing page: `https://bensmith83.github.io/friendly-enigma/`
- Blog: `https://bensmith83.github.io/friendly-enigma/blog/`
- ArXiv Scraper: `https://bensmith83.github.io/friendly-enigma/arxiv-scraper/`
- CVSS Converter: `https://bensmith83.github.io/friendly-enigma/cvss-converter/`
- Scifi Opening Generator: `https://bensmith83.github.io/friendly-enigma/scifi-opening-generator/`

## Setup

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will automatically deploy on the next push

## Adding New Projects

To add another project to the same GitHub Pages site:

1. Create your project folder in the repository root
2. Update `.github/workflows/deploy-pages.yml`:
   - Add the folder path to the `paths` trigger
   - Add a copy command in the "Create combined site" step
3. Update the landing page (`_site/index.html` in the workflow) to include your new project

This approach keeps all projects in one repo and one GitHub Pages deployment!
