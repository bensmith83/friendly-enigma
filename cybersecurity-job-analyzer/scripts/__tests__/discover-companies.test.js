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
  buildDiscoveryPrompt,
} = await import("../discover-companies.js");

describe("discover-companies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildDiscoveryPrompt", () => {
    it("returns a prompt string requesting cybersecurity companies", () => {
      const prompt = buildDiscoveryPrompt([]);
      expect(prompt).toContain("cybersecurity");
      expect(prompt).toContain("JSON");
    });

    it("includes existing companies to avoid duplicates", () => {
      const prompt = buildDiscoveryPrompt(["CrowdStrike", "Palo Alto Networks"]);
      expect(prompt).toContain("CrowdStrike");
      expect(prompt).toContain("Palo Alto Networks");
    });
  });

  describe("generateCompanyList", () => {
    it("returns a list of company objects from Claude", async () => {
      const mockCompanies = [
        {
          name: "CrowdStrike",
          website: "https://crowdstrike.com",
          category: "Endpoint Security",
          description: "Cloud-native endpoint protection",
          founded: 2011,
          isStartup: false,
        },
        {
          name: "Wiz",
          website: "https://wiz.io",
          category: "Cloud Security",
          description: "Cloud security posture management",
          founded: 2020,
          isStartup: true,
        },
      ];

      mockAskClaudeJSON.mockResolvedValueOnce({ companies: mockCompanies });

      const result = await generateCompanyList({ messages: {} }, []);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("CrowdStrike");
      expect(result[1].isStartup).toBe(true);
    });

    it("each company has required fields", async () => {
      const mockCompanies = [
        {
          name: "SentinelOne",
          website: "https://sentinelone.com",
          category: "Endpoint Security",
          description: "AI-powered security platform",
          founded: 2013,
          isStartup: false,
        },
      ];
      mockAskClaudeJSON.mockResolvedValueOnce({ companies: mockCompanies });

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
