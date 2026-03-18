import { jest } from "@jest/globals";

// Mock dependencies
const mockAskClaudeJSON = jest.fn();
const mockFetchPage = jest.fn();

jest.unstable_mockModule("../lib/claude-client.js", () => ({
  createClient: jest.fn(() => ({ messages: {} })),
  askClaude: jest.fn(),
  askClaudeJSON: mockAskClaudeJSON,
}));

jest.unstable_mockModule("../lib/scraper.js", () => ({
  fetchPage: mockFetchPage,
  resolveCareerUrl: jest.fn((url) => [`${url}/careers`, `${url}/jobs`]),
  extractJobLinks: jest.fn(),
}));

const {
  generateCompanyList,
  validateCareerUrls,
  mergeCompanyLists,
  buildCategoryPrompt,
} = await import("../discover-companies.js");

describe("discover-companies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildCategoryPrompt", () => {
    it("returns a prompt for a specific category", () => {
      const prompt = buildCategoryPrompt("Endpoint Security", []);
      expect(prompt).toContain("Endpoint Security");
      expect(prompt).toContain("JSON");
    });

    it("includes existing companies to avoid duplicates", () => {
      const prompt = buildCategoryPrompt("Cloud Security", ["CrowdStrike", "Palo Alto Networks"]);
      expect(prompt).toContain("CrowdStrike");
      expect(prompt).toContain("Palo Alto Networks");
    });
  });

  describe("generateCompanyList", () => {
    it("queries each category and aggregates results", async () => {
      // Mock returns for all 10 categories
      for (let i = 0; i < 10; i++) {
        mockAskClaudeJSON.mockResolvedValueOnce({
          companies: [{ name: `Company${i}`, website: `https://co${i}.com`, category: "Test" }],
        });
      }

      const result = await generateCompanyList({ messages: {} }, []);
      expect(result).toHaveLength(10);
      expect(mockAskClaudeJSON).toHaveBeenCalledTimes(10);
    });

    it("each company has required fields", async () => {
      const mockCompany = {
        name: "SentinelOne",
        website: "https://sentinelone.com",
        category: "Endpoint Security",
        description: "AI-powered security platform",
        founded: 2013,
        isStartup: false,
      };
      for (let i = 0; i < 10; i++) {
        mockAskClaudeJSON.mockResolvedValueOnce({ companies: i === 0 ? [mockCompany] : [] });
      }

      const result = await generateCompanyList({ messages: {} }, []);
      const company = result[0];
      expect(company).toHaveProperty("name");
      expect(company).toHaveProperty("website");
      expect(company).toHaveProperty("category");
      expect(company).toHaveProperty("description");
    });
  });

  describe("validateCareerUrls", () => {
    it("finds a valid career URL for a company", async () => {
      mockFetchPage.mockResolvedValueOnce({
        html: "<html><h1>Careers</h1></html>",
        finalUrl: "https://crowdstrike.com/careers",
        status: 200,
      });

      const result = await validateCareerUrls({
        name: "CrowdStrike",
        website: "https://crowdstrike.com",
        careerUrls: ["https://crowdstrike.com/careers"],
      });
      expect(result.careerUrl).toBe("https://crowdstrike.com/careers");
      expect(result.careerUrlVerified).toBe(true);
    });

    it("tries multiple URL candidates when the first fails", async () => {
      mockFetchPage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          html: "<html><h1>Jobs</h1></html>",
          finalUrl: "https://example.com/jobs",
          status: 200,
        });

      const result = await validateCareerUrls({
        name: "TestCo",
        website: "https://example.com",
        careerUrls: ["https://example.com/careers", "https://example.com/jobs"],
      });
      expect(result.careerUrl).toBe("https://example.com/jobs");
      expect(result.careerUrlVerified).toBe(true);
    });

    it("marks as unverified when no career page found", async () => {
      mockFetchPage.mockResolvedValue(null);

      const result = await validateCareerUrls({
        name: "GhostCo",
        website: "https://ghostco.example",
        careerUrls: ["https://ghostco.example/careers"],
      });
      expect(result.careerUrlVerified).toBe(false);
    });
  });

  describe("mergeCompanyLists", () => {
    it("adds new companies to existing list", () => {
      const existing = [{ name: "CrowdStrike", website: "https://crowdstrike.com" }];
      const discovered = [
        { name: "Wiz", website: "https://wiz.io" },
        { name: "CrowdStrike", website: "https://crowdstrike.com" },
      ];

      const merged = mergeCompanyLists(existing, discovered);
      expect(merged).toHaveLength(2);
      expect(merged.map((c) => c.name)).toContain("Wiz");
    });

    it("updates existing company data when rediscovered", () => {
      const existing = [{ name: "CrowdStrike", website: "https://crowdstrike.com", category: "Old" }];
      const discovered = [{ name: "CrowdStrike", website: "https://crowdstrike.com", category: "Endpoint Security" }];

      const merged = mergeCompanyLists(existing, discovered);
      expect(merged).toHaveLength(1);
      expect(merged[0].category).toBe("Endpoint Security");
    });

    it("preserves existing companies not in new list", () => {
      const existing = [
        { name: "A", website: "https://a.com" },
        { name: "B", website: "https://b.com" },
      ];
      const discovered = [{ name: "C", website: "https://c.com" }];

      const merged = mergeCompanyLists(existing, discovered);
      expect(merged).toHaveLength(3);
    });
  });
});
