import { createClient, askClaude, askClaudeJSON } from "./lib/claude-client.js";
import { readJSON, writeJSON, getDataPath } from "./lib/data-store.js";

const JOBS_FILE = getDataPath("jobs.json");
const CHANGES_FILE = getDataPath("changes.json");
const ANALYSIS_FILE = getDataPath("analysis.json");
const COMPANIES_FILE = getDataPath("companies.json");

export function buildStrategyPrompt(companyName, jobs, changes) {
  // Build rich job summaries using full descriptions when available
  const jobSummary = jobs
    .map((j) => {
      const parts = [`- ${j.title} (${j.department || "Unknown dept"})`];
      if (j.teamContext) {
        parts.push(`  Team: ${j.teamContext}`);
      }
      if (j.fullDescription) {
        // Include full description - this is the key intelligence
        parts.push(`  Description: ${j.fullDescription}`);
      }
      if (j.responsibilities && j.responsibilities.length > 0) {
        parts.push(`  Responsibilities: ${j.responsibilities.join("; ")}`);
      }
      if (j.requirements && j.requirements.length > 0) {
        parts.push(`  Requirements: ${j.requirements.join("; ")}`);
      }
      const techs = j.technologies || j.keywords || [];
      if (techs.length > 0) {
        parts.push(`  Technologies: ${techs.join(", ")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");

  const newJobs = (changes.added || [])
    .map((j) => {
      const desc = j.fullDescription ? ` — ${j.fullDescription.substring(0, 500)}` : "";
      return `- NEW: ${j.title}${desc}`;
    })
    .join("\n");

  return `Analyze the job listings for ${companyName} to identify strategic signals about their product direction and technology investments.

Pay close attention to the full job descriptions — they reveal what products are being built, what problems the company is solving, what technologies they are adopting, and what teams are expanding. The descriptions are the most valuable signal.

Current open positions (${jobs.length} total):
${jobSummary}

${newJobs ? `Newly posted positions:\n${newJobs}` : "No new positions this week."}

Based on these job listings and especially their full descriptions, provide:
1. Strategic signals - what specific new products/capabilities are they building? What problems are they solving?
2. New product areas they appear to be investing in (be specific — cite evidence from descriptions)
3. Technology trends visible in their hiring (languages, frameworks, platforms, cloud providers, specific tools)
4. Team expansion patterns - which teams are growing fastest and what does that signal?

Respond with ONLY valid JSON:
{
  "signals": [
    {
      "signal": "description of strategic signal",
      "confidence": "high|medium|low",
      "evidence": ["specific quotes or details from job descriptions that support this"]
    }
  ],
  "newProductAreas": ["string"],
  "technologyTrends": ["string"],
  "teamExpansion": ["string - which teams are growing and what it suggests"]
}`;
}

export function buildFinancialHealthPrompt(companyName, metrics) {
  return `Assess the financial health and stability of ${companyName} based on their hiring data.

Hiring metrics:
- Current open positions: ${metrics.currentCount}
- Previous week open positions: ${metrics.previousCount}
- Newly added positions: ${(metrics.added || []).length}
- Removed positions: ${(metrics.removed || []).length}
- Net change: ${metrics.currentCount - metrics.previousCount}

Analyze this hiring data to assess:
1. Overall health score (1-10, where 10 is strongest)
2. Hiring trend (growing, stable, declining, volatile)
3. Risk level (low, medium, high, critical)
4. Key signals about company health
5. Any alerts (sudden drops, mass layoffs indicators, hiring freezes)

Respond with ONLY valid JSON:
{
  "healthScore": number,
  "trend": "growing|stable|declining|volatile",
  "riskLevel": "low|medium|high|critical",
  "signals": ["string"],
  "alerts": ["string"]
}`;
}

export function buildSalaryPrompt(jobs) {
  const withSalary = jobs.filter((j) => j.salaryMin || j.salaryMax);
  const salaryData = withSalary
    .map((j) => `- ${j.title} (${j.company || "Unknown"}): $${j.salaryMin || "?"}-$${j.salaryMax || "?"}`)
    .join("\n");

  return `Analyze the following cybersecurity job salary data and generate a report grouped by role category.

Jobs with salary information (${withSalary.length} total):
${salaryData}

Group jobs into categories (e.g., Engineering, Security Research, Management/Leadership, Sales, SOC/Operations, GRC/Compliance, etc.) and calculate statistics for each.

Respond with ONLY valid JSON:
{
  "byCategory": [
    {
      "category": "string",
      "avgMin": number,
      "avgMax": number,
      "median": number,
      "count": number
    }
  ],
  "overallMedian": number,
  "topPaying": [
    {
      "title": "string",
      "salaryMax": number,
      "company": "string"
    }
  ]
}`;
}

export async function analyzeStrategySignals(client, companyName, jobs, changes) {
  const prompt = buildStrategyPrompt(companyName, jobs, changes);
  return await askClaudeJSON(client, prompt);
}

export async function analyzeFinancialHealth(client, companyName, metrics) {
  const prompt = buildFinancialHealthPrompt(companyName, metrics);
  return await askClaudeJSON(client, prompt);
}

export async function generateSalaryReport(client, allJobs) {
  const withSalary = allJobs.filter((j) => j.salaryMin || j.salaryMax);

  if (withSalary.length === 0) {
    return {
      byCategory: [],
      overallMedian: null,
      topPaying: [],
      note: "No jobs with salary data found - no salary information was available in the listings",
    };
  }

  const prompt = buildSalaryPrompt(allJobs);
  return await askClaudeJSON(client, prompt);
}

export async function generateWeeklyReport(client, companyAnalyses, salaryReport, date) {
  const companiesWithJobs = companyAnalyses.filter((c) => c.jobCount > 0);
  const companiesWithoutJobs = companyAnalyses.filter((c) => c.jobCount === 0);

  const summaryPrompt = `Write a 2-3 paragraph executive summary of this week's cybersecurity industry hiring analysis for ${date}.

Total companies tracked: ${companyAnalyses.length}
Companies where we successfully scraped job listings: ${companiesWithJobs.length}
Companies where the scraper could not retrieve listings: ${companiesWithoutJobs.length}

NOTE: Most companies showing 0 jobs are NOT necessarily on a hiring freeze. Our scraper cannot process JavaScript-rendered career pages (which most companies use). The 0-job count reflects scraping limitations, not actual hiring activity. Do NOT claim these companies have "no openings" — instead note that their career pages could not be processed by our automated scraper.

Companies with scraped job data:
${companiesWithJobs
  .map(
    (c) =>
      `- ${c.company}: ${c.jobCount} open positions, health score ${c.financial?.healthScore || "N/A"}/10, trend: ${c.financial?.trend || "unknown"}`
  )
  .join("\n") || "No companies returned job data this week."}

Notable strategy signals:
${companyAnalyses
  .flatMap((c) =>
    (c.strategy?.signals || []).slice(0, 2).map((s) => `- ${c.company}: ${s.signal} (${s.confidence} confidence)`)
  )
  .join("\n") || "No strategy signals available."}

Salary overview: Median salary ${salaryReport.overallMedian ? `$${salaryReport.overallMedian.toLocaleString()}` : "data unavailable — most job listings did not include salary ranges"}

IMPORTANT: Write a balanced summary. Be transparent about the scraping limitations — do NOT claim companies have "no openings" or are on "hiring freezes" just because the scraper returned 0 results. Clearly state that data coverage is limited due to JavaScript-rendered career pages. Focus the insights on companies where data WAS successfully collected.

Write a professional, insightful summary highlighting the most important trends, alerts, and signals. Do NOT use JSON formatting.`;

  const summary = await askClaude(client, summaryPrompt);

  return {
    date,
    generatedAt: new Date().toISOString(),
    summary,
    companies: companyAnalyses,
    salaryReport,
  };
}

export async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = createClient(apiKey);
  const jobs = readJSON(JOBS_FILE, {});
  const changesData = readJSON(CHANGES_FILE, { changes: {} });
  const companies = readJSON(COMPANIES_FILE, []);

  const companyAnalyses = [];
  const allJobsFlat = [];

  for (const company of companies) {
    const companyJobs = jobs[company.name] || [];
    const changes = changesData.changes?.[company.name] || {
      added: [],
      removed: [],
      currentCount: companyJobs.length,
      previousCount: 0,
    };

    if (companyJobs.length === 0) {
      // Include companies with no jobs so the dashboard shows all tracked companies
      companyAnalyses.push({
        company: company.name,
        category: company.category,
        website: company.website,
        jobCount: 0,
        strategy: { signals: [], newProductAreas: [], technologyTrends: [], teamExpansion: [] },
        financial: { healthScore: null, trend: "unknown", riskLevel: "unknown", signals: [], alerts: [] },
      });
      continue;
    }

    console.log(`\nAnalyzing ${company.name} (${companyJobs.length} jobs)...`);

    const taggedJobs = companyJobs.map((j) => ({ ...j, company: company.name }));
    allJobsFlat.push(...taggedJobs);

    console.log("  Analyzing strategy signals...");
    const strategy = await analyzeStrategySignals(client, company.name, companyJobs, changes);

    console.log("  Analyzing financial health...");
    const financial = await analyzeFinancialHealth(client, company.name, {
      currentCount: companyJobs.length,
      previousCount: changes.previousCount || 0,
      added: changes.added || [],
      removed: changes.removed || [],
    });

    companyAnalyses.push({
      company: company.name,
      category: company.category,
      website: company.website,
      jobCount: companyJobs.length,
      strategy,
      financial,
    });

    if (financial.alerts && financial.alerts.length > 0) {
      console.log(`  ALERTS: ${financial.alerts.join(", ")}`);
    }
  }

  console.log("\nGenerating salary report...");
  const salaryReport = await generateSalaryReport(client, allJobsFlat);

  const today = new Date().toISOString().split("T")[0];
  console.log("Generating weekly report...");
  const report = await generateWeeklyReport(client, companyAnalyses, salaryReport, today);

  writeJSON(ANALYSIS_FILE, report);
  writeJSON(getDataPath(`reports/report-${today}.json`), report);

  console.log(`\nAnalysis complete. Report saved for ${today}`);
  console.log(`Companies analyzed: ${companyAnalyses.length}`);
  console.log(`Total jobs: ${allJobsFlat.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
