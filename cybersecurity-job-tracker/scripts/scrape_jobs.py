#!/usr/bin/env python3
"""
Scrape job listings from cybersecurity company careers pages.
Uses ATS APIs (Greenhouse, Lever, Ashby) for structured data,
falls back to Claude for parsing custom HTML careers pages.
"""

import json
import os
import re
import shutil
import sys
import time
import requests
import anthropic
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
COMPANIES_FILE = os.path.join(DATA_DIR, "companies.json")
JOBS_CURRENT = os.path.join(DATA_DIR, "jobs-current.json")
JOBS_PREVIOUS = os.path.join(DATA_DIR, "jobs-previous.json")

MAX_RETRIES = 3
RETRY_DELAY = 2
REQUEST_TIMEOUT = 20
DELAY_BETWEEN_REQUESTS = 1.5  # Be polite to servers

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CyberJobTracker/1.0; +https://github.com/bensmith83/friendly-enigma)"
}

# Relevant job categories for filtering
RELEVANT_KEYWORDS = [
    "research", "security", "engineer", "developer", "architect",
    "cto", "ciso", "vp", "director", "principal", "staff",
    "threat", "malware", "reverse", "exploit", "vulnerability",
    "detection", "response", "forensic", "intelligence", "analyst",
    "data scientist", "machine learning", "ai ", "ml ",
    "product", "strategy", "chief", "head of", "lead",
    "devops", "devsecops", "sre", "platform", "infrastructure",
    "cloud", "kubernetes", "backend", "frontend", "fullstack", "full-stack",
    "sales engineer", "solutions", "presales", "field",
]


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def fetch_url(url, timeout=REQUEST_TIMEOUT):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, timeout=timeout, headers=HEADERS, allow_redirects=True)
            resp.raise_for_status()
            return resp
        except Exception as e:
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
            else:
                raise e


def extract_salary(text):
    if not text:
        return None, None
    patterns = [
        r'\$\s*([\d,]+)\s*[-–—to]+\s*\$?\s*([\d,]+)',
        r'\$([\d,]+)\s*k?\s*[-–—]\s*\$?([\d,]+)\s*k',
        r'([\d,]+)\s*[-–—]\s*([\d,]+)\s*(?:USD|per year|annually)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            low = int(match.group(1).replace(",", ""))
            high = int(match.group(2).replace(",", ""))
            if low < 1000:
                low *= 1000
            if high < 1000:
                high *= 1000
            if 30000 <= low <= 500000 and 30000 <= high <= 1000000:
                return low, high
    return None, None


def normalize_job(title, location="", url="", department="", salary_text=""):
    salary_min, salary_max = extract_salary(salary_text)
    return {
        "title": title.strip(),
        "location": location.strip() if location else "",
        "url": url.strip() if url else "",
        "department": department.strip() if department else "",
        "salary_min": salary_min,
        "salary_max": salary_max,
    }


# --- ATS Platform Scrapers ---

def scrape_greenhouse(company):
    api_id = company.get("ats_api_id", "")
    if not api_id:
        return None
    url = f"https://boards-api.greenhouse.io/v1/boards/{api_id}/jobs"
    try:
        resp = fetch_url(url)
        data = resp.json()
        jobs = []
        for job in data.get("jobs", []):
            loc = job.get("location", {}).get("name", "")
            job_url = job.get("absolute_url", "")
            dept_list = job.get("departments", [])
            dept = dept_list[0].get("name", "") if dept_list else ""
            content = job.get("content", "")
            jobs.append(normalize_job(
                title=job.get("title", ""),
                location=loc,
                url=job_url,
                department=dept,
                salary_text=content,
            ))
        return jobs
    except Exception as e:
        print(f"    Greenhouse API failed for {company['name']}: {e}")
        return None


def scrape_lever(company):
    api_id = company.get("ats_api_id", "")
    if not api_id:
        return None
    url = f"https://api.lever.co/v0/postings/{api_id}"
    try:
        resp = fetch_url(url)
        data = resp.json()
        jobs = []
        for job in data:
            loc_parts = []
            if job.get("categories", {}).get("location"):
                loc_parts.append(job["categories"]["location"])
            dept = job.get("categories", {}).get("team", "")
            salary_text = job.get("descriptionPlain", "")
            jobs.append(normalize_job(
                title=job.get("text", ""),
                location=", ".join(loc_parts),
                url=job.get("hostedUrl", ""),
                department=dept,
                salary_text=salary_text,
            ))
        return jobs
    except Exception as e:
        print(f"    Lever API failed for {company['name']}: {e}")
        return None


def scrape_ashby(company):
    api_id = company.get("ats_api_id", "")
    if not api_id:
        return None
    url = "https://api.ashbyhq.com/posting-api/job-board"
    try:
        resp = requests.post(url, json={"organizationSlug": api_id},
                             timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        jobs = []
        for job in data.get("jobs", []):
            loc = job.get("location", "")
            dept = job.get("departmentName", "")
            jobs.append(normalize_job(
                title=job.get("title", ""),
                location=loc,
                url=job.get("jobUrl", ""),
                department=dept,
            ))
        return jobs
    except Exception as e:
        print(f"    Ashby API failed for {company['name']}: {e}")
        return None


def scrape_custom_html(company, claude_client):
    careers_url = company.get("careers_url", "")
    if not careers_url:
        return None

    try:
        resp = fetch_url(careers_url)
        html = resp.text
    except Exception as e:
        print(f"    Failed to fetch {company['name']} careers page: {e}")
        return None

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)

    # Truncate to avoid token limits
    if len(text) > 15000:
        text = text[:15000]

    if not text.strip() or len(text) < 100:
        print(f"    {company['name']}: careers page too short or empty")
        return None

    prompt = f"""Extract job listings from this careers page for {company['name']}.
URL: {careers_url}

Page content:
{text}

Extract ALL job postings visible on this page. For each job, provide:
- title: Job title
- location: Location (or "Remote" / "Not specified")
- department: Department if shown
- salary_text: Any salary/compensation info if visible

Respond with ONLY a JSON array of job objects. If no jobs are found, respond with an empty array [].
Do not include navigation items, categories, or non-job content."""

    try:
        result = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = result.content[0].text
    except Exception as e:
        print(f"    Claude parsing failed for {company['name']}: {e}")
        return None

    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0]
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0]

    try:
        raw_jobs = json.loads(response_text.strip())
    except json.JSONDecodeError:
        print(f"    Failed to parse Claude response for {company['name']}")
        return None

    if not isinstance(raw_jobs, list):
        return None

    jobs = []
    for j in raw_jobs:
        jobs.append(normalize_job(
            title=j.get("title", ""),
            location=j.get("location", ""),
            url=j.get("url", ""),
            department=j.get("department", ""),
            salary_text=j.get("salary_text", ""),
        ))
    return jobs


def scrape_company(company, claude_client):
    platform = company.get("ats_platform", "custom")
    name = company["name"]

    print(f"  Scraping {name} ({platform})...")

    jobs = None
    if platform == "greenhouse":
        jobs = scrape_greenhouse(company)
    elif platform == "lever":
        jobs = scrape_lever(company)
    elif platform == "ashby":
        jobs = scrape_ashby(company)

    # Fallback to HTML scraping if ATS API failed or platform is custom/workday
    if jobs is None:
        if platform in ("custom", "workday") or jobs is None:
            jobs = scrape_custom_html(company, claude_client)

    if jobs is not None:
        print(f"    Found {len(jobs)} jobs")
    else:
        print(f"    Failed to scrape")

    time.sleep(DELAY_BETWEEN_REQUESTS)
    return jobs


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    claude_client = anthropic.Anthropic(api_key=api_key)
    companies_data = load_json(COMPANIES_FILE)
    companies = companies_data["companies"]

    # Rotate: current -> previous
    if os.path.exists(JOBS_CURRENT):
        current_data = load_json(JOBS_CURRENT)
        if current_data.get("scrape_date"):
            shutil.copy2(JOBS_CURRENT, JOBS_PREVIOUS)
            print("Rotated current jobs to previous")

    results = {}
    total_jobs = 0
    scraped = 0
    failed = 0

    print(f"Scraping {len(companies)} companies...")

    for company in companies:
        name = company["name"]
        jobs = scrape_company(company, claude_client)

        if jobs is not None:
            results[name] = {
                "total_jobs": len(jobs),
                "ats_platform": company.get("ats_platform", "unknown"),
                "careers_url": company.get("careers_url", ""),
                "jobs": jobs,
            }
            total_jobs += len(jobs)
            scraped += 1
        else:
            results[name] = {
                "total_jobs": 0,
                "ats_platform": company.get("ats_platform", "unknown"),
                "careers_url": company.get("careers_url", ""),
                "jobs": [],
                "error": True,
            }
            failed += 1

    output = {
        "last_scraped": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scrape_date": time.strftime("%Y-%m-%d"),
        "total_jobs": total_jobs,
        "companies_scraped": scraped,
        "companies_failed": failed,
        "companies": results,
    }

    save_json(JOBS_CURRENT, output)
    print(f"\nDone. {scraped} companies scraped, {failed} failed, {total_jobs} total jobs found")


if __name__ == "__main__":
    main()
