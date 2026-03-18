import { jest } from "@jest/globals";

const mockAskClaudeJSON = jest.fn();
const mockAskClaude = jest.fn();

jest.unstable_mockModule("../lib/claude-client.js", () => ({
  createClient: jest.fn(() => ({ messages: {} })),
  askClaude: mockAskClaude,
  askClaudeJSON: mockAskClaudeJSON,
}));

const {
  analyzeStrategySignals,
  analyzeFinancialHealth,
  generateSalaryReport,
  generateWeeklyReport,
  buildStrategyPrompt,
  buildFinancialHealthPrompt,
  buildSalaryPrompt,
} = await import("../analyze-jobs.js");

describe("analyze-jobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildStrategyPrompt", () => {
    it("includes company name and job data", () => {
      const jobs = [{ title: "AI Security Engineer", department: "R&D" }];
      const prompt = buildStrategyPrompt("CrowdStrike", jobs, { added: jobs, removed: [] });
      expect(prompt).toContain("CrowdStrike");
      expect(prompt).toContain("AI Security Engineer");
    });

    it("includes full job descriptions when available", () => {
      const jobs = [{
        title: "Detection Engineer",
        department: "Threat Research",
        fullDescription: "Build next-generation eBPF-based kernel sensors for real-time threat detection across cloud workloads.",
        responsibilities: ["Design kernel-level telemetry pipelines"],
        requirements: ["5+ years C/Rust", "Linux kernel internals"],
        technologies: ["Rust", "eBPF", "Kafka"],
        teamContext: "Core Detection Engineering",
      }];
      const prompt = buildStrategyPrompt("CrowdStrike", jobs, { added: jobs, removed: [] });
      expect(prompt).toContain("eBPF-based kernel sensors");
      expect(prompt).toContain("Rust");
      expect(prompt).toContain("Core Detection Engineering");
      expect(prompt).toContain("Design kernel-level telemetry pipelines");
      expect(prompt).toContain("full job descriptions");
    });

    it("includes full descriptions in newly added jobs", () => {
      const newJob = {
        title: "ML Platform Engineer",
        fullDescription: "Build ML inference platform for real-time malware classification using transformer models.",
      };
      const prompt = buildStrategyPrompt("SentinelOne", [newJob], { added: [newJob], removed: [] });
      expect(prompt).toContain("NEW: ML Platform Engineer");
      expect(prompt).toContain("ML inference platform");
    });
  });

  describe("buildFinancialHealthPrompt", () => {
    it("includes job count trends and changes", () => {
      const prompt = buildFinancialHealthPrompt("Wiz", {
        currentCount: 150,
        previousCount: 120,
        added: new Array(40),
        removed: new Array(10),
      });
      expect(prompt).toContain("Wiz");
      expect(prompt).toContain("150");
      expect(prompt).toContain("120");
    });
  });

  describe("buildSalaryPrompt", () => {
    it("includes jobs with salary data", () => {
      const jobs = [
        { title: "Engineer", salaryMin: 150000, salaryMax: 200000 },
        { title: "Analyst", salaryMin: 100000, salaryMax: 130000 },
      ];
      const prompt = buildSalaryPrompt(jobs);
      expect(prompt).toContain("150000");
      expect(prompt).toContain("200000");
    });
  });

  describe("analyzeStrategySignals", () => {
    it("returns strategy insights from Claude analysis", async () => {
      const mockAnalysis = {
        signals: [
          {
            signal: "Investing in AI/ML security capabilities",
            confidence: "high",
            evidence: ["Hiring 5 ML engineers for threat detection team"],
          },
        ],
        newProductAreas: ["AI-powered threat detection"],
        technologyTrends: ["Rust", "WebAssembly"],
      };
      mockAskClaudeJSON.mockResolvedValueOnce(mockAnalysis);

      const result = await analyzeStrategySignals(
        { messages: {} },
        "CrowdStrike",
        [{ title: "ML Engineer - Threat Detection" }],
        { added: [{ title: "ML Engineer - Threat Detection" }], removed: [] }
      );
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].confidence).toBe("high");
      expect(result.newProductAreas).toContain("AI-powered threat detection");
    });
  });

  describe("analyzeFinancialHealth", () => {
    it("returns financial health assessment", async () => {
      const mockAssessment = {
        healthScore: 8,
        trend: "growing",
        riskLevel: "low",
        signals: ["Strong hiring across all departments"],
        alerts: [],
      };
      mockAskClaudeJSON.mockResolvedValueOnce(mockAssessment);

      const result = await analyzeFinancialHealth({ messages: {} }, "Wiz", {
        currentCount: 200,
        previousCount: 150,
        added: new Array(60),
        removed: new Array(10),
      });
      expect(result.healthScore).toBe(8);
      expect(result.trend).toBe("growing");
      expect(result.riskLevel).toBe("low");
    });

    it("flags sudden drops in job count as alerts", async () => {
      const mockAssessment = {
        healthScore: 3,
        trend: "declining",
        riskLevel: "high",
        signals: ["Massive job listing reduction"],
        alerts: ["Job count dropped from 100 to 5 in one week - possible layoffs"],
      };
      mockAskClaudeJSON.mockResolvedValueOnce(mockAssessment);

      const result = await analyzeFinancialHealth({ messages: {} }, "StruggleCo", {
        currentCount: 5,
        previousCount: 100,
        added: new Array(0),
        removed: new Array(95),
      });
      expect(result.riskLevel).toBe("high");
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe("generateSalaryReport", () => {
    it("generates salary statistics by role category", async () => {
      const mockReport = {
        byCategory: [
          {
            category: "Engineering",
            avgMin: 140000,
            avgMax: 190000,
            median: 165000,
            count: 25,
          },
          {
            category: "Security Research",
            avgMin: 130000,
            avgMax: 180000,
            median: 155000,
            count: 10,
          },
        ],
        overallMedian: 160000,
        topPaying: [
          { title: "CISO", salaryMax: 350000, company: "CrowdStrike" },
        ],
      };
      mockAskClaudeJSON.mockResolvedValueOnce(mockReport);

      const jobs = [
        { title: "Security Engineer", salaryMin: 150000, salaryMax: 200000 },
        { title: "SOC Analyst", salaryMin: 90000, salaryMax: 120000 },
      ];
      const result = await generateSalaryReport({ messages: {} }, jobs);
      expect(result.byCategory).toHaveLength(2);
      expect(result.overallMedian).toBe(160000);
    });

    it("handles case with no salary data", async () => {
      const result = await generateSalaryReport({ messages: {} }, [
        { title: "Engineer" }, // no salary fields
      ]);
      expect(result.byCategory).toEqual([]);
      expect(result.note).toContain("no salary");
    });
  });

  describe("generateWeeklyReport", () => {
    it("produces a comprehensive weekly report object", async () => {
      mockAskClaude.mockResolvedValueOnce(
        "This week saw significant hiring activity in cloud security..."
      );

      const companyAnalyses = [
        {
          company: "CrowdStrike",
          jobCount: 150,
          strategy: { signals: [{ signal: "AI investment" }] },
          financial: { healthScore: 8, trend: "growing" },
        },
      ];
      const salaryReport = { byCategory: [], overallMedian: 160000 };

      const result = await generateWeeklyReport(
        { messages: {} },
        companyAnalyses,
        salaryReport,
        "2026-03-18"
      );

      expect(result.date).toBe("2026-03-18");
      expect(result.companies).toHaveLength(1);
      expect(result.summary).toContain("hiring activity");
      expect(result.salaryReport).toBeDefined();
    });
  });
});
