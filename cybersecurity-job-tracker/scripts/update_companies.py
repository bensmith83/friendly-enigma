#!/usr/bin/env python3
"""
Update and maintain the cybersecurity company list.
Uses Claude (Haiku) to suggest new companies and validate careers page URLs.
"""

import json
import os
import sys
import time
import requests
import anthropic

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
COMPANIES_FILE = os.path.join(DATA_DIR, "companies.json")
MAX_RETRIES = 3
RETRY_DELAY = 2


def load_companies():
    with open(COMPANIES_FILE, "r") as f:
        return json.load(f)


def save_companies(data):
    with open(COMPANIES_FILE, "w") as f:
        json.dump(data, f, indent=2)


def call_claude(client, prompt, model="claude-haiku-4-5-20251001", max_tokens=4000):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            print(f"  Claude API attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
    return None


def parse_json_response(text):
    if not text:
        return None
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return None


def check_url_accessible(url, timeout=15):
    try:
        resp = requests.head(url, timeout=timeout, allow_redirects=True,
                             headers={"User-Agent": "Mozilla/5.0 (compatible; CyberJobTracker/1.0)"})
        return resp.status_code < 400
    except Exception:
        try:
            resp = requests.get(url, timeout=timeout, allow_redirects=True,
                                headers={"User-Agent": "Mozilla/5.0 (compatible; CyberJobTracker/1.0)"})
            return resp.status_code < 400
        except Exception:
            return False


def discover_new_companies(client, existing_companies):
    existing_names = [c["name"].lower() for c in existing_companies]
    existing_list = ", ".join(c["name"] for c in existing_companies)

    prompt = f"""You are a cybersecurity industry analyst. I maintain a tracker of cybersecurity companies and their job postings.

Here are the companies I already track:
{existing_list}

Please suggest 5-10 NEW cybersecurity companies I should add, focusing on:
1. Recently funded startups (Series A-C) in the last 12-18 months
2. Companies in emerging areas (AI security, quantum-safe crypto, identity, DSPM, API security, etc.)
3. Companies that are growing and likely hiring

For each company, provide:
- name: Company name
- website: Main website URL
- careers_url: Direct link to their careers/jobs page
- ats_platform: One of "greenhouse", "lever", "ashby", "workday", "custom" (your best guess)
- ats_api_id: If greenhouse/lever/ashby, the company slug used in their API URL
- category: One of: endpoint_security, network_security, cloud_security, application_security, identity_security, data_security, ai_security, ot_ics_security, managed_security, threat_intelligence, vulnerability_management, supply_chain_security, api_security, browser_security, saas_security, security_automation, penetration_testing, incident_response, ransomware_protection, security_training, third_party_risk, email_security, asset_management
- size: "small" (<200 employees), "medium" (200-2000), "large" (>2000)
- public: true/false (publicly traded)
- description: One-line description of what they do

Respond with ONLY a JSON array of company objects. No other text."""

    print("Discovering new companies...")
    result = call_claude(client, prompt)
    new_companies = parse_json_response(result)

    if not new_companies or not isinstance(new_companies, list):
        print("  No new companies suggested or failed to parse response")
        return []

    added = []
    for company in new_companies:
        name = company.get("name", "")
        if name.lower() in existing_names:
            print(f"  Skipping {name} (already tracked)")
            continue

        company["added_date"] = time.strftime("%Y-%m-%d")

        if "founded" not in company:
            company["founded"] = None

        added.append(company)
        print(f"  Added: {name} ({company.get('category', 'unknown')})")

    return added


def validate_careers_urls(client, companies):
    print("Validating careers page URLs...")
    updated = 0
    failed_companies = []

    for company in companies:
        careers_url = company.get("careers_url", "")
        if not careers_url:
            failed_companies.append(company["name"])
            continue

        accessible = check_url_accessible(careers_url)
        if not accessible:
            print(f"  {company['name']}: careers URL unreachable ({careers_url})")
            failed_companies.append(company["name"])

    if failed_companies and len(failed_companies) <= 20:
        prompt = f"""For each of these cybersecurity companies, find their current careers/jobs page URL.
Also identify what ATS platform they use (greenhouse, lever, ashby, workday, or custom).
If they use greenhouse, lever, or ashby, provide the company slug used in the API URL.

Companies:
{json.dumps([{"name": n, "website": next((c["website"] for c in companies if c["name"] == n), "")} for n in failed_companies], indent=2)}

Respond with ONLY a JSON array of objects with fields: name, careers_url, ats_platform, ats_api_id (if applicable).
If you cannot find a careers page, set careers_url to null."""

        result = call_claude(client, prompt)
        fixes = parse_json_response(result)

        if fixes and isinstance(fixes, list):
            fix_map = {f["name"]: f for f in fixes}
            for company in companies:
                if company["name"] in fix_map:
                    fix = fix_map[company["name"]]
                    if fix.get("careers_url"):
                        company["careers_url"] = fix["careers_url"]
                        updated += 1
                        print(f"  Updated {company['name']} careers URL")
                    if fix.get("ats_platform"):
                        company["ats_platform"] = fix["ats_platform"]
                    if fix.get("ats_api_id"):
                        company["ats_api_id"] = fix["ats_api_id"]

    print(f"  Updated {updated} careers URLs")
    return companies


def detect_ats_platform(url):
    url_lower = url.lower()
    if "greenhouse.io" in url_lower or "boards.greenhouse" in url_lower:
        return "greenhouse"
    if "lever.co" in url_lower or "jobs.lever" in url_lower:
        return "lever"
    if "ashbyhq.com" in url_lower:
        return "ashby"
    if "myworkdaysite" in url_lower or "myworkday" in url_lower or "workday" in url_lower:
        return "workday"
    return None


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    data = load_companies()
    companies = data["companies"]
    initial_count = len(companies)

    print(f"Starting with {initial_count} companies")

    # Step 1: Discover new companies
    new_companies = discover_new_companies(client, companies)
    companies.extend(new_companies)

    # Step 2: Validate and fix careers URLs
    companies = validate_careers_urls(client, companies)

    # Step 3: Detect ATS platforms from URLs where possible
    for company in companies:
        if company.get("ats_platform") == "custom":
            careers_url = company.get("careers_url", "")
            detected = detect_ats_platform(careers_url)
            if detected:
                company["ats_platform"] = detected
                print(f"  Detected {detected} for {company['name']}")

    data["companies"] = companies
    data["last_updated"] = time.strftime("%Y-%m-%d")
    data["version"] = data.get("version", 0) + 1

    save_companies(data)
    print(f"\nDone. {initial_count} -> {len(companies)} companies ({len(new_companies)} new)")


if __name__ == "__main__":
    main()
