# My Blog

A simple, secure blog built with Jekyll and GitHub Pages. Inspired by Simon Willison's blog, this is a minimal platform for sharing short thoughts, quotes, and links.

## Features

- 🔒 **Security-first**: Content Security Policy, Dependabot, minimal dependencies
- 🎨 **Clean design**: Simple, modern UI with dark mode support
- 📱 **Responsive**: Works great on all devices
- ⚡ **Fast**: No JavaScript frameworks, minimal CSS, static generation
- 📝 **Easy to write**: Just add markdown files
- 🔗 **Link posts**: Support for linking to external articles
- 🏷️ **Tags**: Organize posts with tags
- 📰 **RSS feed**: Automatically generated
- 🌐 **Social media ready**: OpenGraph and Twitter Card metadata
- ♿ **Accessible**: Semantic HTML, keyboard navigation

## Quick Start

### Publishing a New Post

1. Create a new file in `_posts/` with the format: `YYYY-MM-DD-title.md`
2. Add front matter and content:

```markdown
---
title: "Your Post Title"
date: 2025-12-29 10:00:00 -0000
tags: [tag1, tag2]
---

Your post content here...
```

3. Commit and push to GitHub
4. GitHub Actions will automatically build and deploy

### Publishing via GitHub Web Interface

1. Go to your repository on GitHub
2. Navigate to `blog/_posts/`
3. Click "Add file" → "Create new file"
4. Name it: `YYYY-MM-DD-your-title.md` (use today's date)
5. Add your content with front matter
6. Commit directly to main branch
7. Your post will be live in a few minutes!

## Post Types

### Regular Post

```markdown
---
title: "My Thoughts on Something"
date: 2025-12-29 10:00:00 -0000
tags: [thoughts, philosophy]
---

Write your content here...
```

### Link Post

For sharing interesting articles:

```markdown
---
title: "Interesting Article Title"
date: 2025-12-29 10:00:00 -0000
tags: [links, web]
link: https://example.com/article
---

Your commentary about the linked article...
```

The `link` field adds a "→ Read original article" link at the bottom.

### Post with Quote

```markdown
---
title: "On Writing"
date: 2025-12-29 10:00:00 -0000
tags: [quotes, writing]
---

I love this quote:

> Write what you know.

It's simple but profound...
```

### Post with Code

```markdown
---
title: "Quick Python Tip"
date: 2025-12-29 10:00:00 -0000
tags: [python, tips]
---

Here's a handy pattern:

\`\`\`python
def process_items(items):
    return [item.upper() for item in items]
\`\`\`

This is cleaner than a for loop.
```

## Configuration

Edit `_config.yml` to customize:

```yaml
title: My Blog
description: Short thoughts, quotes, and links
author: Your Name
email: your.email@example.com
url: "https://yourusername.github.io"
baseurl: "/blog"  # Change to "" if deploying to root
```

## Local Development

To preview locally:

```bash
cd blog
bundle install
bundle exec jekyll serve
```

Visit http://localhost:4000/blog/

## GitHub Pages Setup

1. Go to your repository settings
2. Navigate to "Pages"
3. Source: "GitHub Actions"
4. The workflow will automatically deploy on push to main

## Social Media Previews

Your blog automatically generates beautiful social media previews with Open Graph and Twitter Cards.

**See [SOCIAL_MEDIA.md](SOCIAL_MEDIA.md) for full documentation** on:
- How social previews work
- Customizing per-post metadata
- Creating custom images
- Testing your previews

**Quick example** - add to any post's front matter:

```markdown
---
title: "My Post"
description: "Custom description for social media"
image: /blog/assets/images/my-image.png
---
```

## Security

This blog prioritizes security:

- **No external dependencies**: All CSS/JS is self-hosted
- **Content Security Policy**: Strict CSP headers prevent XSS
- **Dependabot**: Automatic security updates
- **Minimal attack surface**: Static site, no user input
- **HTTPS enforced**: Via GitHub Pages

See [SECURITY.md](../SECURITY.md) for our security policy.

## Customization

### Styling

Edit `assets/css/style.css` to customize the design. The CSS uses custom properties for easy theming:

```css
:root {
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --accent-color: #0066cc;
  /* ... */
}
```

Dark mode is automatic via `prefers-color-scheme`.

### Layout

Layouts are in `_layouts/`:
- `default.html`: Base layout with header/footer
- `post.html`: Individual post layout

### Navigation

Edit the nav links in `_layouts/default.html`:

```html
<nav class="site-nav">
  <a href="{{ '/' | relative_url }}">Home</a>
  <a href="{{ '/archive/' | relative_url }}">Archive</a>
  <a href="{{ '/feed.xml' | relative_url }}">RSS</a>
</nav>
```

## File Structure

```
blog/
├── _config.yml          # Jekyll configuration
├── _layouts/            # HTML templates
│   ├── default.html     # Base layout
│   └── post.html        # Post layout
├── _posts/              # Blog posts (markdown)
│   └── YYYY-MM-DD-title.md
├── assets/
│   ├── css/
│   │   └── style.css    # Styles
│   └── js/
│       └── main.js      # Minimal JS
├── index.html           # Homepage
├── archive.html         # Archive page
└── README.md            # This file
```

## RSS Feed

The RSS feed is automatically generated at `/blog/feed.xml` by the jekyll-feed plugin. Subscribe at:

```
https://yourusername.github.io/blog/feed.xml
```

## Tips

1. **Write regularly**: Short posts are fine, Simon Willison often writes just a few paragraphs
2. **Use tags**: They help organize and discover content
3. **Link liberally**: Share what you're reading
4. **Keep it simple**: Don't over-engineer
5. **Commit often**: Your git history is your backup

## Inspiration

This blog is inspired by:
- [Simon Willison's blog](https://simonwillison.net/)
- [Jekyll](https://jekyllrb.com/)
- The IndieWeb movement

## License

Feel free to fork and customize for your own use!
