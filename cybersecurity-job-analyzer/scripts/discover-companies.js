import { createClient, askClaudeJSON } from "./lib/claude-client.js";
import { readJSON, writeJSON, getDataPath } from "./lib/data-store.js";
import { fetchPage, resolveCareerUrl } from "./lib/scraper.js";

const COMPANIES_FILE = getDataPath("companies.json");

export function buildDiscoveryPrompt(existingNames) {
  const exclusion =
    existingNames.length > 0
      ? `\n\nDo NOT include these companies that are already tracked: ${existingNames.join(", ")}`
      : "";

  return `You are a cybersecurity industry analyst. Generate a comprehensive list of cybersecurity companies including both established players and emerging startups.

For each company, provide:
- name: Company name
- website: Company homepage URL
- category: Primary security category (e.g., Endpoint Security, Cloud Security, Identity, Network Security, SIEM/SOAR, Threat Intelligence, Application Security, Data Security, IoT Security, GRC/Compliance)
- description: One sentence about what they do
- founded: Year founded (approximate if unsure)
- isStartup: true if founded after 2018 or has under 500 employees
- careerPageHint: If you know the careers page URL, provide it

Include at least 50 companies across all major cybersecurity categories. Include both public companies and well-funded startups.${exclusion}

Respond with ONLY valid JSON in this format:
{
  "companies": [
    {
      "name": "string",
      "website": "string",
      "category": "string",
      "description": "string",
      "founded": number,
      "isStartup": boolean,
      "careerPageHint": "string or null"
    }
  ]
}`;
}

export async function generateCompanyList(client, existingNames) {
  const prompt = buildDiscoveryPrompt(existingNames);
  const result = await askClaudeJSON(client, prompt, { maxTokens: 8192 });
  return result.companies || [];
}

export async function validateCareerUrls(company) {
  const candidates = company.careerUrls || resolveCareerUrl(company.website);

  if (company.careerPageHint) {
    candidates.unshift(company.careerPageHint);
  }

  for (const url of candidates) {
    const result = await fetchPage(url);
    if (result) {
      return {
        ...company,
        careerUrl: result.finalUrl,
        careerUrlVerified: true,
      };
    }
  }

  return {
    ...company,
    careerUrl: null,
    careerUrlVerified: false,
  };
}

export function mergeCompanyLists(existing, discovered) {
  const merged = new Map();

  for (const company of existing) {
    merged.set(company.name.toLowerCase(), company);
  }

  for (const company of discovered) {
    const key = company.name.toLowerCase();
    if (merged.has(key)) {
      // Update existing with new data, preserving career URL if already verified
      const prev = merged.get(key);
      merged.set(key, {
        ...prev,
        ...company,
        careerUrl: prev.careerUrlVerified ? prev.careerUrl : company.careerUrl,
        careerUrlVerified: prev.careerUrlVerified || false,
      });
    } else {
      merged.set(key, company);
    }
  }

  return Array.from(merged.values());
}

export async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = createClient(apiKey);
  const existing = readJSON(COMPANIES_FILE, []);
  const existingNames = existing.map((c) => c.name);

  console.log(`Existing companies: ${existing.length}`);
  console.log("Discovering new cybersecurity companies...");

  const discovered = await generateCompanyList(client, existingNames);
  console.log(`Discovered ${discovered.length} companies from Claude`);

  const merged = mergeCompanyLists(existing, discovered);
  console.log(`Total after merge: ${merged.length}`);

  console.log("Validating career page URLs...");
  const validated = [];
  for (const company of merged) {
    if (!company.careerUrlVerified) {
      console.log(`  Checking ${company.name}...`);
      const result = await validateCareerUrls(company);
      validated.push(result);
      if (result.careerUrlVerified) {
        console.log(`    Found: ${result.careerUrl}`);
      } else {
        console.log("    No career page found");
      }
    } else {
      validated.push(company);
    }
  }

  const timestamp = new Date().toISOString();
  const output = validated.map((c) => ({ ...c, lastUpdated: timestamp }));

  writeJSON(COMPANIES_FILE, output);
  console.log(`Saved ${output.length} companies to ${COMPANIES_FILE}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
