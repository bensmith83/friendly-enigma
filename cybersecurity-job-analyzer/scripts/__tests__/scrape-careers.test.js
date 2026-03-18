import { jest } from "@jest/globals";

const mockFetchPage = jest.fn();
const mockExtractJobLinks = jest.fn();
const mockAskClaudeJSON = jest.fn();

jest.unstable_mockModule("../lib/scraper.js", () => ({
  fetchPage: mockFetchPage,
  extractJobLinks: mockExtractJobLinks,
  resolveCareerUrl: jest.fn(),
}));

jest.unstable_mockModule("../lib/claude-client.js", () => ({
  createClient: jest.fn(() => ({ messages: {} })),
  askClaude: jest.fn(),
  askClaudeJSON: mockAskClaudeJSON,
}));

const {
  scrapeCompanyCareers,
  parseJobListings,
  detectJobChanges,
  buildJobExtractionPrompt,
} = await import("../scrape-careers.js");

describe("scrape-careers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
