import { createClient, askClaudeJSON } from "./lib/claude-client.js";
import { readJSON, writeJSON, getDataPath } from "./lib/data-store.js";
import { fetchPage } from "./lib/scraper.js";

const COMPANIES_FILE = getDataPath("companies.json");
const JOBS_FILE = getDataPath("jobs.json");

export function buildJobExtractionPrompt(html, companyName) {
  // Truncate HTML to avoid token limits
  const truncated = html.length > 50000 ? html.substring(0, 50000) + "\n[TRUNCATED]" : html;

  return `You are analyzing the careers/jobs page for ${companyName}. Extract all job listings from the HTML below.

For each job, extract:
- title: Job title
- department: Department or team (if available)
- location: Location(s) (if available)
- type: Full-time, Part-time, Contract, etc. (if available)
- salaryMin: Minimum salary in USD (if listed, null otherwise)
- salaryMax: Maximum salary in USD (if listed, null otherwise)
- url: Direct link to the job posting (if available)
- description: Brief summary of the role (1-2 sentences, if visible)
- keywords: Key technologies or skills mentioned

If the page appears to be a job board/ATS with many listings, extract as many as possible.
If salary is listed in a different currency, convert to approximate USD.
If no jobs are found, return an empty array.

Respond with ONLY valid JSON:
{
  "jobs": [
    {
      "title": "string",
      "department": "string or null",
      "location": "string or null",
      "type": "string or null",
      "salaryMin": "number or null",
      "salaryMax": "number or null",
      "url": "string or null",
      "description": "string or null",
      "keywords": ["string"]
    }
  ]
}

HTML content:
${truncated}`;
}

export async function scrapeCompanyCareers(company) {
  if (!company.careerUrl || !company.careerUrlVerified) {
    return {
      company: company.name,
      success: false,
      reason: "Skipped: no verified career URL",
      jobs: [],
    };
  }

  const result = await fetchPage(company.careerUrl);
  if (!result) {
    return {
      company: company.name,
      success: false,
      reason: "Failed to fetch career page",
      jobs: [],
    };
  }

  return {
    company: company.name,
    success: true,
    html: result.html,
    finalUrl: result.finalUrl,
  };
}

export async function parseJobListings(client, html, companyName) {
  const prompt = buildJobExtractionPrompt(html, companyName);
  const result = await askClaudeJSON(client, prompt, { maxTokens: 8192 });
  return result.jobs || [];
}

export function detectJobChanges(previous, current) {
  const prevUrls = new Set(previous.map((j) => j.url));
  const currUrls = new Set(current.map((j) => j.url));

  const added = current.filter((j) => !prevUrls.has(j.url));
  const removed = previous.filter((j) => !currUrls.has(j.url));

  return {
    added,
    removed,
    netChange: added.length - removed.length,
    isFirstRun: previous.length === 0,
    previousCount: previous.length,
    currentCount: current.length,
  };
}

export async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = createClient(apiKey);
  const companies = readJSON(COMPANIES_FILE, []);
  const previousJobs = readJSON(JOBS_FILE, {});

  if (companies.length === 0) {
    console.error("No companies found. Run discover-companies.js first.");
    process.exit(1);
  }

  console.log(`Scraping careers pages for ${companies.length} companies...`);

  const allJobs = {};
  const allChanges = {};

  for (const company of companies) {
    console.log(`\nScraping ${company.name}...`);
    const scrapeResult = await scrapeCompanyCareers(company);

    if (!scrapeResult.success) {
      console.log(`  ${scrapeResult.reason}`);
      allJobs[company.name] = previousJobs[company.name] || [];
      continue;
    }

    console.log("  Extracting job listings with Claude...");
    const jobs = await parseJobListings(client, scrapeResult.html, company.name);
    console.log(`  Found ${jobs.length} jobs`);

    const prevCompanyJobs = previousJobs[company.name] || [];
    const changes = detectJobChanges(prevCompanyJobs, jobs);

    allJobs[company.name] = jobs;
    allChanges[company.name] = changes;

    if (changes.added.length > 0) {
      console.log(`  New jobs: ${changes.added.length}`);
    }
    if (changes.removed.length > 0) {
      console.log(`  Removed jobs: ${changes.removed.length}`);
    }
  }

  const timestamp = new Date().toISOString();
  writeJSON(JOBS_FILE, allJobs);
  writeJSON(getDataPath("changes.json"), { timestamp, changes: allChanges });

  const totalJobs = Object.values(allJobs).reduce((sum, jobs) => sum + jobs.length, 0);
  console.log(`\nTotal jobs across all companies: ${totalJobs}`);
  console.log(`Saved to ${JOBS_FILE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
