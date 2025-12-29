# Blog Setup Guide

## First-Time Setup

Follow these steps to get your blog running:

### 1. Update Configuration

Edit `blog/_config.yml` and update these fields:

```yaml
title: My Blog                           # Your blog title
description: Short thoughts and links    # Brief description
author: Your Name                        # Your name
email: your.email@example.com           # Your email
url: "https://yourusername.github.io"   # Your GitHub Pages URL
```

### 2. Configure GitHub Pages

1. Go to your GitHub repository
2. Click "Settings" → "Pages"
3. Under "Source", select "GitHub Actions"
4. Save

That's it! GitHub Actions will automatically build and deploy your blog when you push to the main branch.

### 3. Customize (Optional)

- **Update example posts**: Edit or delete the posts in `_posts/`
- **Customize styles**: Edit `assets/css/style.css`
- **Update security contact**: Edit `../SECURITY.md` with your email
- **Adjust baseurl**: If deploying to root (not `/blog`), change `baseurl: ""` in `_config.yml`

### 4. Test Locally (Optional)

To preview before publishing:

```bash
cd blog
bundle install
bundle exec jekyll serve
```

Visit http://localhost:4000/blog/

## Publishing Your First Post

### Option A: Via Git (Recommended for regular use)

1. Create a new file in `blog/_posts/`:
   ```bash
   # Use today's date
   touch blog/_posts/2025-12-29-my-first-post.md
   ```

2. Add content:
   ```markdown
   ---
   title: "My First Post"
   date: 2025-12-29 10:00:00 -0000
   tags: [personal, writing]
   ---

   This is my first blog post!

   I'm excited to start writing here.
   ```

3. Commit and push:
   ```bash
   git add blog/_posts/2025-12-29-my-first-post.md
   git commit -m "Add first blog post"
   git push
   ```

4. Wait 1-2 minutes for GitHub Actions to build and deploy

### Option B: Via GitHub Web Interface (Easiest for beginners)

1. Go to your repository on GitHub
2. Navigate to `blog/_posts/`
3. Click "Add file" → "Create new file"
4. Name it: `2025-12-29-my-first-post.md` (use today's date)
5. Add your content with front matter (see example above)
6. Commit directly to main
7. Your post will be live in 1-2 minutes!

## Verifying Deployment

1. Go to the "Actions" tab in your repository
2. You should see a "Deploy Blog to GitHub Pages" workflow running
3. When it turns green ✅, your site is live
4. Visit: `https://yourusername.github.io/blog/`

## Troubleshooting

### Site not appearing

- Check that GitHub Pages source is set to "GitHub Actions"
- Verify the workflow ran successfully in the Actions tab
- Make sure `url` and `baseurl` in `_config.yml` are correct

### Build errors

- Check the Actions tab for error messages
- Ensure your post has valid front matter
- Verify the date format: `YYYY-MM-DD-title.md`

### Local development errors

1. Install dependencies:
   ```bash
   cd blog
   bundle install
   ```

2. If you get permission errors:
   ```bash
   bundle install --path vendor/bundle
   bundle exec jekyll serve
   ```

## Next Steps

- Read the full [README.md](README.md) for more features
- Check out the example posts in `_posts/` for inspiration
- Join the [Jekyll community](https://jekyllrb.com/community/)
- Explore [GitHub Pages documentation](https://docs.github.com/en/pages)

Happy blogging! 🎉
