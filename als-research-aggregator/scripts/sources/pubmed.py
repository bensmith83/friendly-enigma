#!/usr/bin/env python3
"""
Fetch ALS research papers from PubMed via NCBI E-utilities API.
"""

import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

import requests

# NCBI E-utilities endpoints
ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

# Search query for ALS research
ALS_SEARCH_QUERY = (
    "(amyotrophic lateral sclerosis[Title/Abstract] OR "
    "ALS[Title/Abstract] OR "
    "motor neuron disease[Title/Abstract]) AND "
    "(clinical trial[Publication Type] OR "
    "research[Title/Abstract] OR "
    "treatment[Title/Abstract] OR "
    "therapy[Title/Abstract])"
)


def fetch_pubmed_articles(days_back: int = 7, max_results: int = 50) -> list[dict]:
    """
    Fetch recent ALS research articles from PubMed.

    Args:
        days_back: Number of days to look back
        max_results: Maximum number of articles to fetch

    Returns:
        List of article dictionaries
    """
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    date_range = f"{start_date.strftime('%Y/%m/%d')}:{end_date.strftime('%Y/%m/%d')}[PDAT]"

    # First, search for article IDs
    try:
        search_response = requests.get(
            ESEARCH_URL,
            params={
                "db": "pubmed",
                "term": f"{ALS_SEARCH_QUERY} AND {date_range}",
                "retmax": max_results,
                "retmode": "json",
                "sort": "date",
            },
            timeout=30,
        )
        search_response.raise_for_status()
        search_data = search_response.json()

        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        print(f"PubMed: Found {len(id_list)} article IDs")

        if not id_list:
            return []

    except requests.RequestException as e:
        print(f"PubMed search failed: {e}")
        return []

    # Rate limiting: wait before fetching details
    time.sleep(0.5)

    # Fetch article details
    try:
        fetch_response = requests.get(
            EFETCH_URL,
            params={
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml",
            },
            timeout=60,
        )
        fetch_response.raise_for_status()

        return _parse_pubmed_xml(fetch_response.text)

    except requests.RequestException as e:
        print(f"PubMed fetch failed: {e}")
        return []


def _parse_pubmed_xml(xml_text: str) -> list[dict]:
    """Parse PubMed XML response into article list."""
    articles = []

    try:
        root = ET.fromstring(xml_text)

        for article_elem in root.findall(".//PubmedArticle"):
            article = _extract_article(article_elem)
            if article:
                articles.append(article)

    except ET.ParseError as e:
        print(f"PubMed XML parse error: {e}")

    return articles


def _extract_article(article_elem) -> dict | None:
    """Extract article data from PubmedArticle XML element."""
    try:
        medline = article_elem.find(".//MedlineCitation")
        if medline is None:
            return None

        pmid_elem = medline.find(".//PMID")
        pmid = pmid_elem.text if pmid_elem is not None else ""

        article = medline.find(".//Article")
        if article is None:
            return None

        # Title
        title_elem = article.find(".//ArticleTitle")
        title = title_elem.text if title_elem is not None else ""

        # Abstract
        abstract_parts = []
        for abstract_text in article.findall(".//AbstractText"):
            if abstract_text.text:
                label = abstract_text.get("Label", "")
                if label:
                    abstract_parts.append(f"{label}: {abstract_text.text}")
                else:
                    abstract_parts.append(abstract_text.text)
        abstract = " ".join(abstract_parts)

        # Authors
        authors = []
        for author in article.findall(".//Author"):
            last_name = author.find("LastName")
            first_name = author.find("ForeName")
            if last_name is not None and last_name.text:
                name = last_name.text
                if first_name is not None and first_name.text:
                    name = f"{first_name.text} {name}"
                authors.append(name)

        # Journal
        journal_elem = article.find(".//Journal/Title")
        journal = journal_elem.text if journal_elem is not None else ""

        # Publication date
        pub_date = ""
        date_elem = article.find(".//PubDate")
        if date_elem is not None:
            year = date_elem.find("Year")
            month = date_elem.find("Month")
            day = date_elem.find("Day")
            if year is not None:
                pub_date = year.text
                if month is not None:
                    pub_date = f"{month.text} {pub_date}"
                    if day is not None:
                        pub_date = f"{day.text} {pub_date}"

        # Publication types
        pub_types = []
        for pub_type in article.findall(".//PublicationType"):
            if pub_type.text:
                pub_types.append(pub_type.text)

        return {
            "title": title.strip() if title else "",
            "description": abstract[:500] if abstract else "",
            "content": abstract,
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "source_name": journal or "PubMed",
            "source_type": "pubmed",
            "published_at": pub_date,
            "author": ", ".join(authors[:3]) + ("..." if len(authors) > 3 else ""),
            "image_url": "",
            "is_local_nj": False,
            "pmid": pmid,
            "publication_types": pub_types,
        }

    except Exception as e:
        print(f"Error extracting PubMed article: {e}")
        return None
