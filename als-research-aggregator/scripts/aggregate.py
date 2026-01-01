#!/usr/bin/env python3
"""
ALS Research Aggregator - Main aggregation script.

Fetches ALS news from multiple sources, uses Claude to categorize and summarize,
and generates a weekly digest.
"""

import hashlib
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import anthropic

from sources.newsapi import fetch_newsapi_articles
from sources.pubmed import fetch_pubmed_articles
from sources.rss import fetch_rss_articles

# Categories for organizing articles
CATEGORIES = [
    "research",
    "treatment",
    "cure",
    "grants",
    "assistance",
    "local",
]

CATEGORY_DESCRIPTIONS = {
    "research": "Scientific studies, clinical trials, lab discoveries",
    "treatment": "FDA approvals, therapies, symptom management",
    "cure": "Breakthrough potential, experimental approaches",
    "grants": "Funding opportunities, research grants",
    "assistance": "Patient support, caregiver resources, financial aid",
    "local": "New Jersey events, support groups, charities, volunteer opportunities",
}


def load_previous_digests(data_path: Path) -> list[dict]:
    """Load all previous digests."""
    digest_file = data_path / "digests.json"
    if digest_file.exists():
        with open(digest_file) as f:
            return json.load(f)
    return []


def save_digests(digests: list[dict], data_path: Path):
    """Save all digests to file."""
    digest_file = data_path / "digests.json"
    with open(digest_file, "w") as f:
        json.dump(digests, f, indent=2)


def generate_article_id(article: dict) -> str:
    """Generate a unique ID for an article based on URL and title."""
    key = f"{article.get('url', '')}{article.get('title', '')}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def deduplicate_articles(articles: list[dict]) -> list[dict]:
    """Remove duplicate articles based on URL and title similarity."""
    seen_ids = set()
    unique = []

    for article in articles:
        article_id = generate_article_id(article)
        if article_id not in seen_ids:
            seen_ids.add(article_id)
            article["article_id"] = article_id
            unique.append(article)

    return unique


def find_related_previous_articles(
    article: dict, previous_digests: list[dict]
) -> list[dict]:
    """Find articles from previous digests that may be related to this one."""
    # Simple keyword matching for now
    # Could be enhanced with embeddings in the future
    title_words = set(article.get("title", "").lower().split())
    related = []

    for digest in previous_digests[:12]:  # Look back 12 weeks
        for cat_articles in digest.get("categories", {}).values():
            for prev_article in cat_articles:
                prev_title_words = set(prev_article.get("title", "").lower().split())
                # Check for significant word overlap (excluding common words)
                common_words = {"the", "a", "an", "in", "on", "for", "of", "to", "and", "als", "with"}
                meaningful_overlap = (title_words & prev_title_words) - common_words
                if len(meaningful_overlap) >= 3:
                    related.append({
                        "title": prev_article.get("title"),
                        "url": prev_article.get("url"),
                        "digest_date": digest.get("date"),
                    })

    return related[:3]  # Limit to 3 related articles


def categorize_and_summarize_with_claude(
    articles: list[dict],
    previous_digests: list[dict],
    api_key: str,
) -> dict:
    """Use Claude to categorize and summarize articles."""
    client = anthropic.Anthropic(api_key=api_key)

    # Prepare article summaries for Claude
    article_texts = []
    for i, article in enumerate(articles):
        # Handle None values explicitly
        description = article.get('description') or ''
        text = f"""
Article {i + 1}:
- Title: {article.get('title') or 'No title'}
- Source: {article.get('source_name') or 'Unknown'}
- URL: {article.get('url') or ''}
- Description: {description[:500]}
- Is NJ Local: {article.get('is_local_nj', False)}
"""
        article_texts.append(text)

    articles_text = "\n".join(article_texts)

    prompt = f"""You are helping aggregate ALS (amyotrophic lateral sclerosis) news for a patient's family member who wants to stay informed about research, treatments, and local resources in New Jersey.

Here are the articles to process:

{articles_text}

Please analyze these articles and:

1. Categorize each article into ONE of these categories:
   - research: Scientific studies, clinical trials, lab discoveries
   - treatment: FDA approvals, therapies, symptom management
   - cure: Breakthrough potential, experimental approaches
   - grants: Funding opportunities, research grants
   - assistance: Patient support, caregiver resources, financial aid
   - local: New Jersey events, support groups, charities, volunteer opportunities (prioritize articles marked as NJ Local)

2. For each article, provide:
   - A 2-3 sentence summary that captures the key information
   - The category it belongs to
   - An importance score from 1-5 (5 being most important/impactful)

3. Identify the 3-5 most significant stories this week and explain why they're important.

Respond in this exact JSON format:
{{
    "articles": [
        {{
            "article_index": 1,
            "category": "research",
            "summary": "Your 2-3 sentence summary here. Must include the key facts.",
            "importance": 4,
            "key_entities": ["entity1", "entity2"]
        }}
    ],
    "highlights": [
        {{
            "article_index": 1,
            "why_important": "Brief explanation of significance"
        }}
    ],
    "weekly_summary": "A 2-3 paragraph overview of this week's most important ALS news, written for a family member staying informed."
}}

Important: Every summary must be factual and based only on the article content. Do not make up information."""

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text

        # Extract JSON from response
        # Handle case where response might have markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        return json.loads(response_text.strip())

    except Exception as e:
        print(f"Claude API error: {e}")
        # Return a basic structure if Claude fails
        return {
            "articles": [
                {
                    "article_index": i + 1,
                    "category": "research",
                    "summary": (article.get("description") or "")[:200],
                    "importance": 3,
                    "key_entities": [],
                }
                for i, article in enumerate(articles)
            ],
            "highlights": [],
            "weekly_summary": "Unable to generate summary due to API error.",
        }


def build_digest(
    articles: list[dict],
    claude_analysis: dict,
    previous_digests: list[dict],
) -> dict:
    """Build the final digest structure."""
    today = datetime.now()

    # Organize articles by category
    categories = {cat: [] for cat in CATEGORIES}

    for analysis in claude_analysis.get("articles", []):
        idx = analysis.get("article_index", 1) - 1
        if 0 <= idx < len(articles):
            article = articles[idx].copy()
            article["summary"] = analysis.get("summary") or article.get("description") or ""
            article["importance"] = analysis.get("importance", 3)
            article["key_entities"] = analysis.get("key_entities", [])

            # Find related previous articles
            article["related_previous"] = find_related_previous_articles(
                article, previous_digests
            )

            category = analysis.get("category", "research")
            if category in categories:
                categories[category].append(article)
            else:
                categories["research"].append(article)

    # Sort each category by importance
    for cat in categories:
        categories[cat].sort(key=lambda x: x.get("importance", 0), reverse=True)

    # Build highlights
    highlights = []
    for highlight in claude_analysis.get("highlights", []):
        idx = highlight.get("article_index", 1) - 1
        if 0 <= idx < len(articles):
            highlights.append({
                "article": articles[idx],
                "why_important": highlight.get("why_important", ""),
            })

    # Build references list
    references = []
    for article in articles:
        references.append({
            "title": article.get("title", ""),
            "url": article.get("url", ""),
            "source": article.get("source_name", ""),
            "date": article.get("published_at", ""),
        })

    return {
        "date": today.strftime("%Y-%m-%d"),
        "week_of": today.strftime("%B %d, %Y"),
        "digest_number": len(previous_digests) + 1,
        "weekly_summary": claude_analysis.get("weekly_summary", ""),
        "highlights": highlights,
        "categories": categories,
        "category_descriptions": CATEGORY_DESCRIPTIONS,
        "article_count": len(articles),
        "references": references,
        "generated_at": today.isoformat(),
    }


def main():
    """Main entry point."""
    print("=" * 60)
    print("ALS Research Aggregator")
    print(f"Run date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Check for API keys
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    newsapi_key = os.environ.get("NEWSAPI_KEY")

    if not anthropic_key:
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    # Set up paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / "data"
    data_dir.mkdir(exist_ok=True)

    # Load previous digests
    previous_digests = load_previous_digests(data_dir)
    print(f"Loaded {len(previous_digests)} previous digests")

    # Check if we already have a digest for today
    today = datetime.now().strftime("%Y-%m-%d")
    if previous_digests and previous_digests[0].get("date") == today:
        print("Already have a digest for today, skipping")
        return

    # Fetch articles from all sources
    print("\n--- Fetching from sources ---")
    all_articles = []

    # NewsAPI
    if newsapi_key:
        newsapi_articles = fetch_newsapi_articles(newsapi_key, days_back=7)
        all_articles.extend(newsapi_articles)
    else:
        print("NewsAPI: Skipped (no API key)")

    # PubMed
    pubmed_articles = fetch_pubmed_articles(days_back=7)
    all_articles.extend(pubmed_articles)

    # RSS feeds
    rss_articles = fetch_rss_articles(days_back=7)
    all_articles.extend(rss_articles)

    print(f"\nTotal articles fetched: {len(all_articles)}")

    if not all_articles:
        print("No articles found, exiting")
        return

    # Deduplicate
    unique_articles = deduplicate_articles(all_articles)
    print(f"After deduplication: {len(unique_articles)} articles")

    # Limit to top articles if too many (to manage API costs)
    max_articles = 50
    if len(unique_articles) > max_articles:
        # Prioritize NJ local and diverse sources
        local_articles = [a for a in unique_articles if a.get("is_local_nj")]
        other_articles = [a for a in unique_articles if not a.get("is_local_nj")]
        unique_articles = local_articles[:10] + other_articles[: max_articles - 10]
        print(f"Limited to {len(unique_articles)} articles for processing")

    # Categorize and summarize with Claude
    print("\n--- Processing with Claude ---")
    claude_analysis = categorize_and_summarize_with_claude(
        unique_articles,
        previous_digests,
        anthropic_key,
    )
    print("Claude analysis complete")

    # Build the digest
    digest = build_digest(unique_articles, claude_analysis, previous_digests)

    # Save the new digest
    previous_digests.insert(0, digest)
    save_digests(previous_digests, data_dir)

    print(f"\n--- Digest #{digest['digest_number']} created ---")
    print(f"Date: {digest['week_of']}")
    print(f"Articles: {digest['article_count']}")
    for cat, articles in digest["categories"].items():
        if articles:
            print(f"  {cat}: {len(articles)} articles")

    print(f"\nDigest saved to {data_dir / 'digests.json'}")


if __name__ == "__main__":
    main()
