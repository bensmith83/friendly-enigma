import { createClient, askClaude, askClaudeJSON } from "./lib/claude-client.js";
import { readJSON, writeJSON, getDataPath } from "./lib/data-store.js";

const JOBS_FILE = getDataPath("jobs.json");
const CHANGES_FILE = getDataPath("changes.json");
const ANALYSIS_FILE = getDataPath("analysis.json");
const COMPANIES_FILE = getDataPath("companies.json");

export function buildStrategyPrompt(companyName, jobs, changes) {
  const jobSummary = jobs
    .map((j) => `- ${j.title} (${j.department || "Unknown dept"}) [${j.keywords?.join(", ") || "no keywords"}]`)
    .join("\n");

  const newJobs = (changes.added || [])
    .map((j) => `- NEW: ${j.title}`)
    .join("\n");

  return `Analyze the job listings for ${companyName} to identify strategic signals about their product direction and technology investments.

Current open positions (${jobs.length} total):
${jobSummary}

${newJobs ? `Newly posted positions:\n${newJobs}` : "No new positions this week."}

Based on these job listings, provide:
1. Strategic signals - what new products/capabilities are they building?
2. New product areas they appear to be investing in
3. Technology trends visible in their hiring (languages, frameworks, platforms)

Respond with ONLY valid JSON:
{
  "signals": [
    {
      "signal": "description of strategic signal",
      "confidence": "high|medium|low",
      "evidence": ["specific job titles or patterns that support this"]
    }
  ],
  "newProductAreas": ["string"],
  "technologyTrends": ["string"]
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
  const summaryPrompt = `Write a 2-3 paragraph executive summary of this week's cybersecurity industry hiring analysis for ${date}.

Key data:
${companyAnalyses
  .map(
    (c) =>
      `- ${c.company}: ${c.jobCount} open positions, health score ${c.financial?.healthScore || "N/A"}/10, trend: ${c.financial?.trend || "unknown"}`
  )
  .join("\n")}

Notable strategy signals:
${companyAnalyses
  .flatMap((c) =>
    (c.strategy?.signals || []).map((s) => `- ${c.company}: ${s.signal} (${s.confidence} confidence)`)
  )
  .join("\n")}

Salary overview: Median salary ${salaryReport.overallMedian ? `$${salaryReport.overallMedian.toLocaleString()}` : "data unavailable"}

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
