#!/usr/bin/env python3
"""
Analyze scraped job listings using Claude Sonnet for strategic intelligence.
Generates three report sections:
1. Market Overview - industry trends, hot technologies, hiring momentum
2. Company Intel - per-company strategy insights, financial health signals
3. Salary Report - compensation data by role type and level
"""

import json
import os
import sys
import time
import anthropic

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
JOBS_CURRENT = os.path.join(DATA_DIR, "jobs-current.json")
JOBS_PREVIOUS = os.path.join(DATA_DIR, "jobs-previous.json")
COMPANIES_FILE = os.path.join(DATA_DIR, "companies.json")
REPORTS_FILE = os.path.join(DATA_DIR, "reports.json")

MAX_RETRIES = 3
RETRY_DELAY = 3
ANALYSIS_MODEL = os.environ.get("ANALYSIS_MODEL", "claude-sonnet-4-5-20250514")


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def call_claude(client, prompt, max_tokens=4000):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.messages.create(
                model=ANALYSIS_MODEL,
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


def build_company_summary(current, previous, companies_meta):
    """Build a compact summary of each company's job data for Claude analysis."""
    summaries = []
    meta_map = {c["name"]: c for c in companies_meta}

    for name, data in current.get("companies", {}).items():
        if data.get("error"):
            continue

        jobs = data.get("jobs", [])
        current_count = len(jobs)
        prev_data = previous.get("companies", {}).get(name, {})
        prev_count = len(prev_data.get("jobs", []))

        meta = meta_map.get(name, {})

        # Compact job title list
        titles = [j["title"] for j in jobs]
        departments = list(set(j.get("department", "") for j in jobs if j.get("department")))

        # Salary data
        salary_jobs = [j for j in jobs if j.get("salary_min")]
        salary_info = []
        for j in salary_jobs:
            salary_info.append(f"{j['title']}: ${j['salary_min']:,}-${j['salary_max']:,}")

        summary = {
            "name": name,
            "category": meta.get("category", "unknown"),
            "size": meta.get("size", "unknown"),
            "public": meta.get("public", False),
            "description": meta.get("description", ""),
            "current_job_count": current_count,
            "previous_job_count": prev_count,
            "change": current_count - prev_count,
            "departments": departments[:10],
            "job_titles": titles[:50],
            "salary_data": salary_info[:20],
        }
        summaries.append(summary)

    return summaries


def analyze_market_overview(client, summaries, current_date):
    """Generate market overview with trends and technology signals."""
    # Build a compact version for the prompt
    compact = []
    for s in summaries:
        compact.append({
            "name": s["name"],
            "category": s["category"],
            "size": s["size"],
            "jobs": s["current_job_count"],
            "prev_jobs": s["previous_job_count"],
            "change": s["change"],
            "top_titles": s["job_titles"][:15],
        })

    prompt = f"""You are a cybersecurity industry analyst. Analyze this weekly job market data from {current_date}.

Company job data:
{json.dumps(compact, indent=1)}

Generate a market overview report as JSON with this structure:
{{
  "summary": "2-3 sentence executive summary of the cybersecurity job market this week",
  "total_companies_active": <number of companies with jobs>,
  "total_positions": <total jobs across all companies>,
  "week_over_week_change_pct": <percentage change from previous week>,
  "hiring_momentum": "accelerating" | "stable" | "decelerating" | "mixed",
  "top_technologies": [
    {{"name": "technology/skill", "demand_signal": "high/medium/low", "context": "why this is trending"}}
  ],
  "emerging_trends": [
    {{"trend": "description", "evidence": "what job data shows this", "significance": "high/medium/low"}}
  ],
  "sector_breakdown": [
    {{"sector": "category name", "companies_hiring": <count>, "total_jobs": <count>, "momentum": "up/down/flat"}}
  ],
  "notable_movements": [
    "Any notable changes, like companies suddenly hiring a lot or stopping hiring"
  ]
}}

Focus on actionable intelligence. What would a CISO, security startup founder, or job seeker want to know?
Respond with ONLY the JSON object."""

    print("Generating market overview...")
    result = call_claude(client, prompt, max_tokens=3000)
    return parse_json_response(result)


def analyze_company_intel(client, summaries, batch_start, batch_end):
    """Analyze a batch of companies for strategy and financial signals."""
    batch = summaries[batch_start:batch_end]
    if not batch:
        return []

    prompt = f"""You are a cybersecurity industry analyst specializing in competitive intelligence.

Analyze these companies' job postings to infer their product strategy, financial health, and strategic direction.

Company data:
{json.dumps(batch, indent=1)}

For EACH company, generate analysis as JSON array:
[
  {{
    "company": "name",
    "strategy_insights": {{
      "product_direction": "What new products/features they appear to be building based on job titles",
      "technology_focus": ["key technologies they're investing in"],
      "expansion_areas": "Geographic or market expansion signals"
    }},
    "financial_health": {{
      "signal": "strong" | "healthy" | "cautious" | "concerning" | "unknown",
      "reasoning": "Why you think this - based on hiring volume, role types, changes week over week",
      "risk_factors": ["any warning signs from the job data"]
    }},
    "hiring_profile": {{
      "total_jobs": <number>,
      "week_change": <change from last week>,
      "top_departments": ["most active departments"],
      "seniority_mix": "What level of roles - entry, mid, senior, exec",
      "notable_roles": ["any particularly interesting or unusual job titles"]
    }},
    "competitive_positioning": "Brief assessment of where this company is heading in their market segment"
  }}
]

Be specific and evidence-based. Reference actual job titles when making inferences.
If previous_job_count is 0 and current is 0, skip financial health inference.
Respond with ONLY the JSON array."""

    result = call_claude(client, prompt, max_tokens=4000)
    return parse_json_response(result) or []


def analyze_salary_data(client, summaries, current_date):
    """Generate salary analysis from available compensation data."""
    all_salary_data = []
    for s in summaries:
        for entry in s.get("salary_data", []):
            all_salary_data.append(f"{s['name']} - {entry}")

    if not all_salary_data:
        return {
            "has_data": False,
            "note": "No salary data available this week. Most companies do not list salary ranges on their careers pages.",
            "by_role_type": [],
            "by_level": [],
        }

    prompt = f"""Analyze this cybersecurity salary data from job postings collected on {current_date}.

Salary data points:
{chr(10).join(all_salary_data)}

Generate a salary analysis report as JSON:
{{
  "has_data": true,
  "total_data_points": <number of salary ranges>,
  "by_role_type": [
    {{
      "role_type": "e.g. Security Engineer, Threat Researcher, Product Manager",
      "count": <number of postings>,
      "salary_range_low": <lowest minimum>,
      "salary_range_high": <highest maximum>,
      "median_estimate": <estimated median>,
      "companies_reporting": ["list of companies"]
    }}
  ],
  "by_level": [
    {{
      "level": "Junior/Mid/Senior/Staff/Director/VP/C-Suite",
      "avg_range": "$X - $Y",
      "count": <number of postings>
    }}
  ],
  "insights": [
    "Key takeaways about compensation trends"
  ],
  "highest_paying_roles": [
    {{"title": "job title", "company": "company name", "range": "$X - $Y"}}
  ]
}}

Respond with ONLY the JSON object."""

    print("Generating salary analysis...")
    result = call_claude(client, prompt, max_tokens=3000)
    return parse_json_response(result)


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    current = load_json(JOBS_CURRENT)
    previous = load_json(JOBS_PREVIOUS)
    companies_meta = load_json(COMPANIES_FILE)["companies"]

    if not current.get("scrape_date"):
        print("No current job data to analyze. Run scrape_jobs.py first.")
        sys.exit(0)

    current_date = current["scrape_date"]
    print(f"Analyzing job data from {current_date}")
    print(f"Using model: {ANALYSIS_MODEL}")

    # Build summaries
    summaries = build_company_summary(current, previous, companies_meta)
    print(f"Built summaries for {len(summaries)} companies")

    # 1. Market overview
    market = analyze_market_overview(client, summaries, current_date)
    if not market:
        market = {"error": "Failed to generate market overview"}

    # 2. Company intel (process in batches of 15 to stay within token limits)
    print("Generating company intelligence...")
    all_company_intel = []
    batch_size = 15
    for i in range(0, len(summaries), batch_size):
        batch_num = (i // batch_size) + 1
        total_batches = (len(summaries) + batch_size - 1) // batch_size
        print(f"  Batch {batch_num}/{total_batches}...")
        intel = analyze_company_intel(client, summaries, i, i + batch_size)
        all_company_intel.extend(intel)
        if i + batch_size < len(summaries):
            time.sleep(1)

    # 3. Salary analysis
    salary = analyze_salary_data(client, summaries, current_date)
    if not salary:
        salary = {"has_data": False, "note": "Salary analysis failed"}

    # Build report
    report = {
        "date": current_date,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_used": ANALYSIS_MODEL,
        "companies_analyzed": len(summaries),
        "market_overview": market,
        "company_intel": all_company_intel,
        "salary_report": salary,
    }

    # Load existing reports and prepend new one
    reports_data = load_json(REPORTS_FILE)
    reports_data["reports"].insert(0, report)

    # Keep last 52 weeks of reports
    reports_data["reports"] = reports_data["reports"][:52]

    save_json(REPORTS_FILE, reports_data)
    print(f"\nReport saved. {len(all_company_intel)} companies analyzed.")
    print(f"Salary data: {'Yes' if salary.get('has_data') else 'No'}")


if __name__ == "__main__":
    main()
