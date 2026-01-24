# Claude Development Notes

## Project Overview
This repository contains multiple sub-projects deployed via GitHub Actions to GitHub Pages.

## Deployment Infrastructure
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (`.github/workflows/deploy-pages.yml`)
- **Build Process**: Automated builds on push to main/master branch
- **Structure**: Multi-project repository with central landing page

## How It Works
Each sub-project lives in its own folder in the repository root. The GitHub Actions workflow:
1. Builds the Jekyll blog
2. Copies all project folders to a combined `_site` directory
3. Generates a landing page (`index.html`) that links to all projects
4. Deploys everything to GitHub Pages

## Adding New Projects
To add a new project:
1. Create project folder in repository root
2. Update `.github/workflows/deploy-pages.yml`:
   - Add folder to `paths` trigger
   - Add copy command in "Create combined site" step
   - Update the landing page HTML with a new link
3. Push to main branch

See `GITHUB_PAGES.md` for more detailed documentation.
