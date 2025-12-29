#!/usr/bin/env python3
"""
Scrape arxiv.org for AI and cybersecurity related papers.
Selects one interesting paper per day and stores it.
"""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import os
import random
import time

# ArXiv API base URL
ARXIV_API = "http://export.arxiv.org/api/query?"

# Search queries for AI and cybersecurity papers
SEARCH_QUERIES = [
    "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV",  # AI categories
    "cat:cs.CR",  # Cryptography and Security
    "all:cybersecurity OR all:adversarial OR all:security",
]

def fetch_arxiv_papers(query, max_results=20):
    """Fetch papers from arxiv API."""
    params = {
        'search_query': query,
        'start': 0,
        'max_results': max_results,
        'sortBy': 'submittedDate',
        'sortOrder': 'descending'
    }

    url = ARXIV_API + urllib.parse.urlencode(params)

    try:
        # Add User-Agent header as required by arXiv API
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (compatible; ArXivBot/1.0; +https://github.com)')

        with urllib.request.urlopen(req) as response:
            return response.read()
    except Exception as e:
        print(f"Error fetching papers: {e}")
        return None

def parse_arxiv_response(xml_data):
    """Parse XML response from arxiv API."""
    if not xml_data:
        return []

    # Parse XML
    root = ET.fromstring(xml_data)

    # Namespace for arxiv API
    ns = {
        'atom': 'http://www.w3.org/2005/Atom',
        'arxiv': 'http://arxiv.org/schemas/atom'
    }

    papers = []

    for entry in root.findall('atom:entry', ns):
        paper = {}

        # Extract paper details
        paper['id'] = entry.find('atom:id', ns).text.split('/abs/')[-1]
        paper['title'] = entry.find('atom:title', ns).text.strip().replace('\n', ' ')
        paper['summary'] = entry.find('atom:summary', ns).text.strip().replace('\n', ' ')
        paper['published'] = entry.find('atom:published', ns).text
        paper['link'] = entry.find('atom:id', ns).text

        # Authors
        authors = []
        for author in entry.findall('atom:author', ns):
            name = author.find('atom:name', ns)
            if name is not None:
                authors.append(name.text)
        paper['authors'] = authors

        # Categories
        categories = []
        for category in entry.findall('atom:category', ns):
            term = category.get('term')
            if term:
                categories.append(term)
        paper['categories'] = categories

        papers.append(paper)

    return papers

def select_interesting_paper(papers):
    """Select one interesting paper from the list."""
    if not papers:
        return None

    # Score papers based on interesting keywords in title/abstract
    interesting_keywords = [
        'novel', 'breakthrough', 'state-of-the-art', 'sota', 'survey',
        'benchmark', 'dataset', 'transformer', 'neural', 'deep learning',
        'vulnerability', 'attack', 'defense', 'privacy', 'encryption',
        'adversarial', 'robust', 'secure', 'threat', 'malware'
    ]

    scored_papers = []
    for paper in papers:
        score = 0
        text = (paper['title'] + ' ' + paper['summary']).lower()

        for keyword in interesting_keywords:
            if keyword in text:
                score += 1

        # Prefer papers with more authors (often more comprehensive)
        score += min(len(paper['authors']), 5) * 0.1

        scored_papers.append((score, paper))

    # Sort by score and return top paper
    scored_papers.sort(reverse=True, key=lambda x: x[0])

    # Return the top paper, or a random one from top 5 if we have that many
    if len(scored_papers) >= 5:
        return random.choice([p[1] for p in scored_papers[:5]])
    elif scored_papers:
        return scored_papers[0][1]

    return None

def load_existing_papers(filepath):
    """Load existing papers from JSON file."""
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_papers(papers, filepath):
    """Save papers to JSON file."""
    with open(filepath, 'w') as f:
        json.dump(papers, f, indent=2)

def main():
    """Main function to scrape and store papers."""
    print("Fetching papers from arxiv.org...")

    all_papers = []

    # Fetch papers for each query
    for i, query in enumerate(SEARCH_QUERIES):
        print(f"Searching: {query}")
        xml_data = fetch_arxiv_papers(query, max_results=20)
        papers = parse_arxiv_response(xml_data)
        all_papers.extend(papers)

        # Rate limiting: wait 3 seconds between requests (arXiv recommendation)
        if i < len(SEARCH_QUERIES) - 1:
            time.sleep(3)

    # Remove duplicates by paper ID
    seen_ids = set()
    unique_papers = []
    for paper in all_papers:
        if paper['id'] not in seen_ids:
            seen_ids.add(paper['id'])
            unique_papers.append(paper)

    print(f"Found {len(unique_papers)} unique papers")

    # Select one interesting paper
    selected_paper = select_interesting_paper(unique_papers)

    if not selected_paper:
        print("No papers found")
        return

    print(f"Selected paper: {selected_paper['title']}")

    # Add selection date
    selected_paper['selected_date'] = datetime.now().strftime('%Y-%m-%d')

    # Load existing papers
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    filepath = os.path.join(data_dir, 'papers.json')

    existing_papers = load_existing_papers(filepath)

    # Check if we already have a paper for today
    today = datetime.now().strftime('%Y-%m-%d')
    has_today = any(p.get('selected_date') == today for p in existing_papers)

    if not has_today:
        # Add new paper to the beginning of the list
        existing_papers.insert(0, selected_paper)

        # Keep only last 30 days
        existing_papers = existing_papers[:30]

        # Save updated papers
        save_papers(existing_papers, filepath)
        print(f"Saved paper to {filepath}")
    else:
        print("Already have a paper for today")

if __name__ == '__main__':
    main()
