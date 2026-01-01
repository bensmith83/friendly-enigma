#!/usr/bin/env python3
"""
Fetch ALS-related news from NewsAPI.org
"""

import os
from datetime import datetime, timedelta
from typing import Optional

import requests

NEWSAPI_BASE = "https://newsapi.org/v2/everything"

# Search terms for ALS news
ALS_QUERY = (
    '"ALS" OR "amyotrophic lateral sclerosis" OR "Lou Gehrig\'s disease" '
    'OR "motor neuron disease"'
)

# Additional query for NJ-specific news
NJ_QUERY = (
    '("ALS" OR "amyotrophic lateral sclerosis") AND '
    '("New Jersey" OR "NJ" OR "New Brunswick")'
)


def fetch_newsapi_articles(
    api_key: str,
    days_back: int = 7,
    page_size: int = 100,
) -> list[dict]:
    """
    Fetch ALS news articles from NewsAPI.

    Args:
        api_key: NewsAPI API key
        days_back: Number of days to look back
        page_size: Maximum articles to fetch

    Returns:
        List of article dictionaries
    """
    if not api_key:
        print("Warning: No NewsAPI key provided, skipping NewsAPI source")
        return []

    articles = []
    from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    # Fetch general ALS news
    try:
        response = requests.get(
            NEWSAPI_BASE,
            params={
                "q": ALS_QUERY,
                "from": from_date,
                "sortBy": "publishedAt",
                "pageSize": page_size,
                "language": "en",
                "apiKey": api_key,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") == "ok":
            for article in data.get("articles", []):
                articles.append(_normalize_article(article, "newsapi"))
            print(f"NewsAPI: Found {len(data.get('articles', []))} general ALS articles")
        else:
            print(f"NewsAPI error: {data.get('message', 'Unknown error')}")

    except requests.RequestException as e:
        print(f"NewsAPI request failed: {e}")

    # Fetch NJ-specific news (separate query to ensure local coverage)
    try:
        response = requests.get(
            NEWSAPI_BASE,
            params={
                "q": NJ_QUERY,
                "from": from_date,
                "sortBy": "publishedAt",
                "pageSize": 50,
                "language": "en",
                "apiKey": api_key,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") == "ok":
            nj_count = 0
            for article in data.get("articles", []):
                normalized = _normalize_article(article, "newsapi")
                normalized["is_local_nj"] = True
                articles.append(normalized)
                nj_count += 1
            print(f"NewsAPI: Found {nj_count} NJ-specific articles")

    except requests.RequestException as e:
        print(f"NewsAPI NJ request failed: {e}")

    return articles


def _normalize_article(article: dict, source_type: str) -> dict:
    """Normalize NewsAPI article to common format."""
    return {
        "title": article.get("title", "").strip(),
        "description": article.get("description", ""),
        "content": article.get("content", ""),
        "url": article.get("url", ""),
        "source_name": article.get("source", {}).get("name", "Unknown"),
        "source_type": source_type,
        "published_at": article.get("publishedAt", ""),
        "author": article.get("author", ""),
        "image_url": article.get("urlToImage", ""),
        "is_local_nj": False,
    }
