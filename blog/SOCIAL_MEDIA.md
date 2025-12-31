# Social Media Preview Configuration

Your blog is configured with proper Open Graph and Twitter Card metadata for beautiful social media previews.

## How It Works

The blog uses the `jekyll-seo-tag` plugin which automatically generates:
- **Open Graph** tags (Facebook, LinkedIn, etc.)
- **Twitter Card** tags
- **Schema.org** structured data
- Proper meta descriptions

## Default Configuration

In `_config.yml`, the following defaults are set:

```yaml
# Basic info
title: My Blog
description: Short thoughts, quotes, and links

# Social media
twitter:
  username: yourusername
  card: summary_large_image

# Default images
logo: /blog/assets/images/logo.svg
image: /blog/assets/images/default-social.svg
```

## Customizing Per Post

You can override the defaults in any post's front matter:

### Custom Description and Image

```markdown
---
title: "My Amazing Post"
date: 2025-12-29 10:00:00 -0000
description: "A custom description for social media previews"
image: /blog/assets/images/my-custom-image.png
tags: [example]
---

Your post content...
```

### Custom Twitter Card Type

```markdown
---
title: "My Post"
twitter:
  card: summary
  image: /blog/assets/images/square-image.png
---
```

### Full Customization

```markdown
---
title: "Advanced Post"
description: "Custom description for social previews"
image: /blog/assets/images/custom-og-image.png
twitter:
  card: summary_large_image
  image: /blog/assets/images/twitter-specific.png
  creator: "@specificauthor"
author:
  twitter: specificauthor
---
```

## Image Specifications

### Open Graph Image (Facebook, LinkedIn)
- **Recommended size**: 1200 × 630 pixels
- **Aspect ratio**: 1.91:1
- **Format**: PNG or JPG
- **Max file size**: < 8 MB

### Twitter Card Image
- **Large card**: 1200 × 628 pixels (same as OG)
- **Summary card**: 300 × 157 pixels minimum
- **Format**: PNG, JPG, or GIF
- **Max file size**: < 5 MB

## Creating Custom Images

### Option 1: Use the Default Template

The default social image is an SVG that you can customize:
1. Edit `/blog/assets/images/default-social.svg`
2. Change the text, colors, or design
3. Convert to PNG if needed (browsers can use SVG, but PNG is safer)

### Option 2: Create Per-Post Images

For important posts, create custom 1200×630 images:

```bash
# Save to blog/assets/images/
my-post-image.png (1200×630)
```

Then reference in the post:

```markdown
---
title: "My Post"
image: /blog/assets/images/my-post-image.png
---
```

### Option 3: Use a Design Tool

Tools for creating social images:
- [Canva](https://www.canva.com/) - Templates for social media
- [Figma](https://www.figma.com/) - Design custom graphics
- [Pablo by Buffer](https://pablo.buffer.com/) - Quick social images

## Testing Your Previews

### Facebook/LinkedIn
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Test URL: `https://bensmith83.github.io/friendly-enigma/blog/YYYY/MM/DD/post-title/`

### Twitter
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Requires Twitter login

### General Preview
- [OpenGraph.xyz](https://www.opengraph.xyz/)
- Shows how your link appears across platforms

## What Gets Generated

For a post with full metadata, `jekyll-seo-tag` generates:

```html
<!-- Open Graph -->
<meta property="og:title" content="My Post Title" />
<meta property="og:description" content="Post description" />
<meta property="og:image" content="https://...image.png" />
<meta property="og:url" content="https://...post-url/" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="My Blog" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@yourusername" />
<meta name="twitter:title" content="My Post Title" />
<meta name="twitter:description" content="Post description" />
<meta name="twitter:image" content="https://...image.png" />

<!-- And more... -->
```

## Best Practices

1. **Always add descriptions**: If not set, the first 200 characters are used
2. **Use descriptive titles**: They appear in social previews
3. **Create custom images for important posts**: Stand out in feeds
4. **Test before sharing**: Use the validators above
5. **Keep images under 1 MB**: Faster loading
6. **Use descriptive alt text**: Add via `image_alt` in front matter

## Example: Full Featured Post

```markdown
---
title: "The Ultimate Guide to Writing Better Code"
date: 2025-12-29 14:00:00 -0000
description: "Learn 10 proven techniques to write cleaner, more maintainable code that your team will love."
image: /blog/assets/images/writing-better-code.png
image_alt: "Code editor showing clean, well-formatted code"
tags: [programming, best-practices, tutorial]
author:
  name: "Jane Developer"
  twitter: janedev
---

Your amazing content here...
```

When shared on social media, this will show:
- ✅ Custom title
- ✅ Compelling description
- ✅ Eye-catching image
- ✅ Author attribution
- ✅ Tags for context

## Updating Configuration

To update the site-wide defaults:

1. Edit `_config.yml`
2. Update `title`, `description`, `twitter.username`, etc.
3. Replace `/blog/assets/images/default-social.svg` with your design
4. Commit and push changes
5. Clear social media cache (use debuggers above)

Your blog is now ready for beautiful social media previews! 🎉
