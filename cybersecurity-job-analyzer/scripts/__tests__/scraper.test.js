import { jest } from "@jest/globals";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { fetchPage, extractJobLinks, resolveCareerUrl } = await import("../lib/scraper.js");

describe("scraper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchPage", () => {
    it("fetches HTML content from a URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<html><body>Hello</body></html>"),
        url: "https://example.com",
        status: 200,
      });

      const result = await fetchPage("https://example.com");
      expect(result.html).toBe("<html><body>Hello</body></html>");
      expect(result.finalUrl).toBe("https://example.com");
    });

    it("follows redirects and returns the final URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<html>Greenhouse</html>"),
        url: "https://boards.greenhouse.io/company",
        status: 200,
      });

      const result = await fetchPage("https://company.com/careers");
      expect(result.finalUrl).toBe("https://boards.greenhouse.io/company");
    });

    it("returns null on HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        url: "https://example.com/404",
      });

      const result = await fetchPage("https://example.com/404");
      expect(result).toBeNull();
    });

    it("returns null on network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await fetchPage("https://down.example.com");
      expect(result).toBeNull();
    });

    it("sets a reasonable user-agent header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<html></html>"),
        url: "https://example.com",
        status: 200,
      });

      await fetchPage("https://example.com");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("Mozilla"),
          }),
        })
      );
    });
  });

  describe("extractJobLinks", () => {
    it("extracts links containing job-related keywords from HTML", () => {
      const html = `
        <html>
          <a href="/careers/software-engineer">Software Engineer</a>
          <a href="/about">About Us</a>
          <a href="/jobs/analyst">Security Analyst</a>
          <a href="/open-positions/cto">CTO</a>
        </html>
      `;
      const links = extractJobLinks(html, "https://example.com");
      expect(links.length).toBeGreaterThanOrEqual(2);
      expect(links.some((l) => l.url.includes("software-engineer"))).toBe(true);
      expect(links.some((l) => l.url.includes("analyst"))).toBe(true);
    });

    it("resolves relative URLs to absolute", () => {
      const html = '<a href="/careers/job-123">Job 123</a>';
      const links = extractJobLinks(html, "https://example.com");
      expect(links[0].url).toBe("https://example.com/careers/job-123");
    });

    it("returns empty array for pages with no job links", () => {
      const html = '<a href="/about">About</a><a href="/contact">Contact</a>';
      const links = extractJobLinks(html, "https://example.com");
      expect(links).toEqual([]);
    });
  });

  describe("resolveCareerUrl", () => {
    it("identifies common career page URL patterns", () => {
      const urls = resolveCareerUrl("https://crowdstrike.com");
      expect(urls).toContain("https://crowdstrike.com/careers");
      expect(urls).toContain("https://crowdstrike.com/jobs");
    });

    it("handles URLs with trailing slashes", () => {
      const urls = resolveCareerUrl("https://example.com/");
      expect(urls.some((u) => u.includes("/careers"))).toBe(true);
    });
  });
});
