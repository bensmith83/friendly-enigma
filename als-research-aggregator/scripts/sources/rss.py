#!/usr/bin/env python3
"""
Fetch ALS news from RSS feeds including Google News.
"""

from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import quote

import feedparser

# Google News RSS search URLs
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

# RSS Feed sources
RSS_FEEDS = [
    {
        "name": "ALS Association News",
        "url": "https://www.als.org/news/feed",
        "category_hint": "assistance",
    },
    {
        "name": "ALS News Today",
        "url": "https://alsnewstoday.com/feed/",
        "category_hint": "research",
    },
]

# Search queries for Google News
GOOGLE_NEWS_QUERIES = [
    "ALS amyotrophic lateral sclerosis",
    "ALS research treatment",
    "ALS clinical trial",
    '"New Jersey" ALS',
]


def fetch_rss_articles(days_back: int = 7) -> list[dict]:
    """
    Fetch ALS articles from RSS feeds.

    Args:
        days_back: Number of days to look back

    Returns:
        List of article dictionaries
    """
    articles = []
    cutoff_date = datetime.now() - timedelta(days=days_back)

    # Fetch from dedicated ALS RSS feeds
    for feed_info in RSS_FEEDS:
        try:
            feed_articles = _fetch_feed(
                feed_info["url"],
                feed_info["name"],
                feed_info.get("category_hint"),
                cutoff_date,
            )
            articles.extend(feed_articles)
            print(f"RSS ({feed_info['name']}): Found {len(feed_articles)} articles")
        except Exception as e:
            print(f"RSS feed {feed_info['name']} failed: {e}")

    # Fetch from Google News RSS
    for query in GOOGLE_NEWS_QUERIES:
        try:
            url = GOOGLE_NEWS_RSS.format(query=quote(query))
            feed_articles = _fetch_feed(
                url,
                f"Google News ({query[:30]}...)",
                None,
                cutoff_date,
            )
            # Mark NJ-specific articles
            if "New Jersey" in query or "NJ" in query:
                for article in feed_articles:
                    article["is_local_nj"] = True
            articles.extend(feed_articles)
            print(f"Google News ({query[:20]}...): Found {len(feed_articles)} articles")
        except Exception as e:
            print(f"Google News query failed: {e}")

    return articles


def _fetch_feed(
    url: str,
    source_name: str,
    category_hint: str | None,
    cutoff_date: datetime,
) -> list[dict]:
    """Fetch and parse a single RSS feed."""
    articles = []

    feed = feedparser.parse(url)

    if feed.bozo and not feed.entries:
        raise Exception(f"Feed parse error: {feed.bozo_exception}")

    for entry in feed.entries:
        # Parse publication date
        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                pub_date = datetime(*entry.published_parsed[:6])
            except (TypeError, ValueError):
                pass
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            try:
                pub_date = datetime(*entry.updated_parsed[:6])
            except (TypeError, ValueError):
                pass

        # Skip old articles
        if pub_date and pub_date < cutoff_date:
            continue

        # Extract article data
        article = {
            "title": entry.get("title", "").strip(),
            "description": _clean_html(entry.get("summary", entry.get("description", ""))),
            "content": _clean_html(entry.get("content", [{}])[0].get("value", ""))
            if entry.get("content")
            else "",
            "url": entry.get("link", ""),
            "source_name": source_name,
            "source_type": "rss",
            "published_at": pub_date.isoformat() if pub_date else "",
            "author": entry.get("author", ""),
            "image_url": _extract_image(entry),
            "is_local_nj": False,
            "category_hint": category_hint,
        }

        if article["title"] and article["url"]:
            articles.append(article)

    return articles


def _clean_html(text: str) -> str:
    """Remove HTML tags from text."""
    import re

    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r"<[^>]+>", "", text)
    # Normalize whitespace
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


def _extract_image(entry) -> str:
    """Extract image URL from RSS entry."""
    # Check media content
    if hasattr(entry, "media_content"):
        for media in entry.media_content:
            if media.get("type", "").startswith("image"):
                return media.get("url", "")

    # Check enclosures
    if hasattr(entry, "enclosures"):
        for enclosure in entry.enclosures:
            if enclosure.get("type", "").startswith("image"):
                return enclosure.get("href", "")

    return ""
