import { jest } from "@jest/globals";

const mockFetchPage = jest.fn();
const mockExtractJobLinks = jest.fn();
const mockDiscoverAtsJobs = jest.fn();
const mockAskClaudeJSON = jest.fn();

jest.unstable_mockModule("../lib/scraper.js", () => ({
  fetchPage: mockFetchPage,
  extractJobLinks: mockExtractJobLinks,
  resolveCareerUrl: jest.fn(),
  discoverAtsJobs: mockDiscoverAtsJobs,
}));

jest.unstable_mockModule("../lib/claude-client.js", () => ({
  createClient: jest.fn(() => ({ messages: {} })),
  askClaude: jest.fn(),
  askClaudeJSON: mockAskClaudeJSON,
}));

const {
  scrapeCompanyCareers,
  parseJobListings,
  scrapeJobDetail,
  buildJobDetailPrompt,
  enrichJobsWithDescriptions,
  detectJobChanges,
  buildJobExtractionPrompt,
} = await import("../scrape-careers.js");

describe("scrape-careers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default, ATS discovery returns null (no ATS board found)
    mockDiscoverAtsJobs.mockResolvedValue(null);
  });

  describe("buildJobExtractionPrompt", () => {
    it("includes the HTML content and requests structured output", () => {
      const prompt = buildJobExtractionPrompt("<html><h1>Jobs</h1></html>", "CrowdStrike");
      expect(prompt).toContain("CrowdStrike");
      expect(prompt).toContain("JSON");
    });
  });

  describe("scrapeCompanyCareers", () => {
    it("fetches careers page and returns raw HTML", async () => {
      mockFetchPage.mockResolvedValueOnce({
        html: "<html><div class='jobs'><a href='/job/1'>Engineer</a></div></html>",
        finalUrl: "https://example.com/careers",
        status: 200,
      });

      const result = await scrapeCompanyCareers({
        name: "TestCo",
        careerUrl: "https://example.com/careers",
        careerUrlVerified: true,
      });

      expect(result.html).toContain("Engineer");
      expect(result.success).toBe(true);
    });

    it("returns failure when page cannot be fetched", async () => {
      mockFetchPage.mockResolvedValueOnce(null);

      const result = await scrapeCompanyCareers({
        name: "DeadCo",
        careerUrl: "https://deadco.example/careers",
        careerUrlVerified: true,
      });

      expect(result.success).toBe(false);
    });

    it("skips companies without a verified career URL", async () => {
      const result = await scrapeCompanyCareers({
        name: "NoCareers",
        careerUrl: null,
        careerUrlVerified: false,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("no verified");
    });
  });

  describe("parseJobListings", () => {
    it("uses Claude to extract structured job data from HTML", async () => {
      const mockJobs = [
        {
          title: "Senior Security Engineer",
          department: "Engineering",
          location: "Remote",
          type: "Full-time",
          salaryMin: 150000,
          salaryMax: 200000,
          url: "https://example.com/jobs/1",
        },
      ];
      mockAskClaudeJSON.mockResolvedValueOnce({ jobs: mockJobs });

      const result = await parseJobListings(
        { messages: {} },
        "<html>job listings html</html>",
        "TestCo"
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Senior Security Engineer");
      expect(result[0].salaryMin).toBe(150000);
    });

    it("returns empty array when Claude finds no jobs", async () => {
      mockAskClaudeJSON.mockResolvedValueOnce({ jobs: [] });

      const result = await parseJobListings(
        { messages: {} },
        "<html>no jobs here</html>",
        "EmptyCo"
      );
      expect(result).toEqual([]);
    });
  });

  describe("buildJobDetailPrompt", () => {
    it("requests full job description extraction from detail page HTML", () => {
      const prompt = buildJobDetailPrompt(
        "<html><h1>Senior Security Engineer</h1><p>Build next-gen SIEM...</p></html>",
        "Senior Security Engineer",
        "CrowdStrike"
      );
      expect(prompt).toContain("CrowdStrike");
      expect(prompt).toContain("Senior Security Engineer");
      expect(prompt).toContain("full description");
    });
  });

  describe("scrapeJobDetail", () => {
    it("fetches an individual job page and extracts full description via Claude", async () => {
      mockFetchPage.mockResolvedValueOnce({
        html: "<html><div class='description'>Build cloud-native SIEM platform using Rust and eBPF for kernel-level telemetry. You will architect real-time detection pipelines processing 10TB/day.</div></html>",
        finalUrl: "https://example.com/jobs/123",
        status: 200,
      });
      mockAskClaudeJSON.mockResolvedValueOnce({
        fullDescription: "Build cloud-native SIEM platform using Rust and eBPF for kernel-level telemetry. Architect real-time detection pipelines processing 10TB/day.",
        responsibilities: [
          "Architect real-time detection pipelines",
          "Build kernel-level telemetry with eBPF",
        ],
        requirements: [
          "5+ years Rust experience",
          "Experience with eBPF or kernel programming",
        ],
        technologies: ["Rust", "eBPF", "Kafka", "Kubernetes"],
        teamContext: "Core Detection Engineering team",
      });

      const result = await scrapeJobDetail(
        { messages: {} },
        "https://example.com/jobs/123",
        "Security Engineer",
        "CrowdStrike"
      );

      expect(result.fullDescription).toContain("SIEM");
      expect(result.responsibilities).toHaveLength(2);
      expect(result.requirements).toHaveLength(2);
      expect(result.technologies).toContain("Rust");
      expect(result.technologies).toContain("eBPF");
      expect(result.teamContext).toContain("Detection Engineering");
    });

    it("returns null when job detail page cannot be fetched", async () => {
      mockFetchPage.mockResolvedValueOnce(null);

      const result = await scrapeJobDetail(
        { messages: {} },
        "https://example.com/jobs/404",
        "Engineer",
        "TestCo"
      );
      expect(result).toBeNull();
    });
  });

  describe("enrichJobsWithDescriptions", () => {
    it("adds full descriptions to jobs that have URLs", async () => {
      mockFetchPage.mockResolvedValue({
        html: "<html><div>Job details here</div></html>",
        finalUrl: "https://example.com/jobs/1",
        status: 200,
      });
      mockAskClaudeJSON.mockResolvedValue({
        fullDescription: "Detailed description of the role.",
        responsibilities: ["Build things"],
        requirements: ["Know things"],
        technologies: ["Python"],
        teamContext: "Engineering",
      });

      const jobs = [
        { title: "Engineer", url: "https://example.com/jobs/1" },
        { title: "Analyst", url: "https://example.com/jobs/2" },
      ];

      const enriched = await enrichJobsWithDescriptions(
        { messages: {} },
        jobs,
        "TestCo",
        { maxJobs: 5 }
      );

      expect(enriched[0].fullDescription).toContain("Detailed description");
      expect(enriched[0].technologies).toContain("Python");
      expect(enriched).toHaveLength(2);
    });

    it("skips jobs without URLs", async () => {
      const jobs = [
        { title: "Engineer", url: null },
        { title: "Analyst" },
      ];

      const enriched = await enrichJobsWithDescriptions(
        { messages: {} },
        jobs,
        "TestCo",
        { maxJobs: 5 }
      );

      expect(enriched[0].fullDescription).toBeUndefined();
      expect(enriched[1].fullDescription).toBeUndefined();
      expect(mockFetchPage).not.toHaveBeenCalled();
    });

    it("respects maxJobs limit to control API costs", async () => {
      mockFetchPage.mockResolvedValue({
        html: "<html>detail</html>",
        finalUrl: "https://example.com/jobs/1",
        status: 200,
      });
      mockAskClaudeJSON.mockResolvedValue({
        fullDescription: "desc",
        responsibilities: [],
        requirements: [],
        technologies: [],
        teamContext: null,
      });

      const jobs = Array.from({ length: 10 }, (_, i) => ({
        title: `Job ${i}`,
        url: `https://example.com/jobs/${i}`,
      }));

      await enrichJobsWithDescriptions({ messages: {} }, jobs, "TestCo", {
        maxJobs: 3,
      });

      expect(mockFetchPage).toHaveBeenCalledTimes(3);
    });
  });

  describe("detectJobChanges", () => {
    it("identifies new jobs that appeared since last scrape", () => {
      const previous = [
        { title: "Engineer", url: "https://example.com/jobs/1" },
      ];
      const current = [
        { title: "Engineer", url: "https://example.com/jobs/1" },
        { title: "Analyst", url: "https://example.com/jobs/2" },
      ];

      const changes = detectJobChanges(previous, current);
      expect(changes.added).toHaveLength(1);
      expect(changes.added[0].title).toBe("Analyst");
      expect(changes.removed).toHaveLength(0);
    });

    it("identifies removed jobs", () => {
      const previous = [
        { title: "Engineer", url: "https://example.com/jobs/1" },
        { title: "Manager", url: "https://example.com/jobs/3" },
      ];
      const current = [
        { title: "Engineer", url: "https://example.com/jobs/1" },
      ];

      const changes = detectJobChanges(previous, current);
      expect(changes.removed).toHaveLength(1);
      expect(changes.removed[0].title).toBe("Manager");
    });

    it("calculates net change count", () => {
      const previous = [
        { title: "A", url: "https://example.com/jobs/1" },
        { title: "B", url: "https://example.com/jobs/2" },
      ];
      const current = [
        { title: "A", url: "https://example.com/jobs/1" },
        { title: "C", url: "https://example.com/jobs/3" },
        { title: "D", url: "https://example.com/jobs/4" },
      ];

      const changes = detectJobChanges(previous, current);
      expect(changes.added).toHaveLength(2);
      expect(changes.removed).toHaveLength(1);
      expect(changes.netChange).toBe(1);
    });

    it("handles empty previous list (first run)", () => {
      const changes = detectJobChanges([], [
        { title: "Engineer", url: "https://example.com/jobs/1" },
      ]);
      expect(changes.added).toHaveLength(1);
      expect(changes.removed).toHaveLength(0);
      expect(changes.isFirstRun).toBe(true);
    });
  });
});
