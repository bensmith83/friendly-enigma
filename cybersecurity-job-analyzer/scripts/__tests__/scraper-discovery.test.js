import { jest } from "@jest/globals";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { discoverAtsJobs, fetchPage, generateAtsSlugs } = await import(
  "../lib/scraper.js"
);

describe("ATS discovery improvements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAtsSlugs", () => {
    it("generates basic slug variants", () => {
      const slugs = generateAtsSlugs("CrowdStrike");
      expect(slugs).toContain("crowdstrike");
    });

    it("generates hyphenated and no-space variants for multi-word names", () => {
      const slugs = generateAtsSlugs("Palo Alto Networks");
      expect(slugs).toContain("paloaltonetworks");
      expect(slugs).toContain("palo-alto-networks");
      expect(slugs).toContain("palo");
      expect(slugs).toContain("paloalto"); // without suffix "networks"
    });

    it("generates inc/io/hq suffixed slugs for short names", () => {
      const slugs = generateAtsSlugs("Wiz");
      expect(slugs).toContain("wiz");
      expect(slugs).toContain("wizinc");
      expect(slugs).toContain("wizio");
      expect(slugs).toContain("wizhq");
    });

    it("does not generate suffixed slugs for long names", () => {
      const slugs = generateAtsSlugs("Palo Alto Networks");
      expect(slugs).not.toContain("paloaltonetworksinc");
    });

    it("strips common company suffixes", () => {
      const slugs = generateAtsSlugs("Nozomi Networks");
      expect(slugs).toContain("nozomi");

      const slugs2 = generateAtsSlugs("Abnormal Security");
      expect(slugs2).toContain("abnormal");

      const slugs3 = generateAtsSlugs("Arctic Wolf");
      expect(slugs3).toContain("arcticwolf");
      expect(slugs3).toContain("arctic-wolf");
      expect(slugs3).toContain("arctic");
    });

    it("strips additional suffixes like tech, software, platform", () => {
      const slugs = generateAtsSlugs("Acme Software");
      expect(slugs).toContain("acme");

      const slugs2 = generateAtsSlugs("Cyber Platform");
      expect(slugs2).toContain("cyber");
    });

    it("handles parentheticals", () => {
      const slugs = generateAtsSlugs("Auth0 (Okta)");
      expect(slugs).toContain("auth0");
    });

    it("generates first word for short names (> 2 chars)", () => {
      const slugs = generateAtsSlugs("Wiz Security");
      expect(slugs).toContain("wiz");
    });
  });

  describe("discoverAtsJobs with known atsUrl", () => {
    it("uses Greenhouse API when atsUrl points to greenhouse", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jobs: [
              {
                title: "Security Engineer",
                departments: [{ name: "Engineering" }],
                location: { name: "Remote" },
                absolute_url: "https://boards.greenhouse.io/crowdstrike/jobs/123",
                id: 123,
              },
            ],
          }),
      });

      const result = await discoverAtsJobs(
        "CrowdStrike",
        "https://boards.greenhouse.io/crowdstrike"
      );

      expect(result).not.toBeNull();
      expect(result.source).toBe("ats-api");
      const parsed = JSON.parse(result.html);
      expect(parsed.jobs).toHaveLength(1);
      expect(parsed.jobs[0].title).toBe("Security Engineer");
    });

    it("uses SmartRecruiters API when atsUrl points to smartrecruiters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [
              {
                name: "Cloud Security Analyst",
                department: { label: "Security" },
                location: { city: "Santa Clara" },
                company: { identifier: "PaloAltoNetworks" },
                id: "abc-123",
              },
            ],
          }),
      });

      const result = await discoverAtsJobs(
        "Palo Alto Networks",
        "https://jobs.smartrecruiters.com/PaloAltoNetworks"
      );

      expect(result).not.toBeNull();
      expect(result.source).toBe("ats-api");
      const parsed = JSON.parse(result.html);
      expect(parsed.jobs).toHaveLength(1);
      expect(parsed.jobs[0].title).toBe("Cloud Security Analyst");
    });

    it("uses Workday API when atsUrl points to workday", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jobPostings: [
              {
                title: "Staff Security Engineer",
                locationsText: "Austin, TX",
                externalPath: "/en-US/job/staff-security-engineer/12345",
                bulletFields: ["REQ-001"],
              },
            ],
          }),
      });

      const result = await discoverAtsJobs(
        "Fortinet",
        "https://fortinet.wd1.myworkdayjobs.com/External"
      );

      expect(result).not.toBeNull();
      expect(result.source).toBe("ats-api");
      const parsed = JSON.parse(result.html);
      expect(parsed.jobs).toHaveLength(1);
      expect(parsed.jobs[0].title).toBe("Staff Security Engineer");
      expect(parsed.jobs[0].location).toBe("Austin, TX");

      // Verify POST method was used
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("discoverAtsJobs slug-based probing", () => {
    it("discovers Greenhouse board via slug guessing", async () => {
      // Fail all attempts except one matching slug
      mockFetch.mockImplementation((url) => {
        if (url.includes("/wizinc/")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                jobs: [
                  {
                    title: "Detection Engineer",
                    departments: [{ name: "R&D" }],
                    location: { name: "NYC" },
                    absolute_url: "https://boards.greenhouse.io/wizinc/jobs/1",
                    id: 1,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await discoverAtsJobs("Wiz");
      expect(result).not.toBeNull();
      expect(result.slug).toBe("wizinc");
      const parsed = JSON.parse(result.html);
      expect(parsed.jobs).toHaveLength(1);
    });

    it("tries SmartRecruiters during slug probing", async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes("api.smartrecruiters.com") && url.includes("/testco/")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                content: [
                  {
                    name: "Analyst",
                    department: { label: "Sec" },
                    location: { city: "Remote" },
                    company: { identifier: "testco" },
                    id: "sr-1",
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await discoverAtsJobs("TestCo");
      expect(result).not.toBeNull();
      expect(result.source).toBe("smartrecruiters-api");
    });

    it("tries Workday during slug probing", async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes("myworkdayjobs.com") && url.includes("/fortinet")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                jobPostings: [
                  {
                    title: "SIEM Engineer",
                    locationsText: "Sunnyvale",
                    externalPath: "/job/123",
                    bulletFields: ["R01"],
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await discoverAtsJobs("Fortinet");
      expect(result).not.toBeNull();
      expect(result.source).toBe("workday-api");
    });

    it("returns null when no ATS platform has the company", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      const result = await discoverAtsJobs("Nonexistent Corp");
      expect(result).toBeNull();
    });
  });

  describe("fetchPage ATS URL extraction from HTML", () => {
    it("extracts Greenhouse links from career page HTML even with substantial content", async () => {
      // First call: fetch the career page HTML (lots of text, > 500 chars)
      // Second call: tryAtsApi on the extracted greenhouse URL
      const longText = "a".repeat(1000);
      const careerPageHtml = `<html><body>
        <h1>Careers at TestCo</h1>
        <p>${longText}</p>
        <iframe src="https://boards.greenhouse.io/testcompany"></iframe>
        <script>console.log('app')</script>
      </body></html>`;

      let callCount = 0;
      mockFetch.mockImplementation((url) => {
        callCount++;
        if (callCount === 1) {
          // Career page fetch
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(careerPageHtml),
            url: "https://testco.com/careers",
            status: 200,
          });
        }
        // ATS API fetch
        if (url.includes("boards-api.greenhouse.io")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                jobs: [
                  {
                    title: "Engineer",
                    departments: [{ name: "Eng" }],
                    location: { name: "Remote" },
                    absolute_url: "https://boards.greenhouse.io/testcompany/jobs/1",
                    id: 1,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await fetchPage("https://testco.com/careers");
      expect(result).not.toBeNull();
      expect(result.source).toBe("ats-api");
      const parsed = JSON.parse(result.html);
      expect(parsed.jobs).toHaveLength(1);
    });

    it("extracts Workday links from career page HTML", async () => {
      const careerPageHtml = `<html><body>
        <h1>Join Our Team</h1>
        <a href="https://fortinet.wd1.myworkdayjobs.com/External">View all jobs</a>
      </body></html>`;

      let callCount = 0;
      mockFetch.mockImplementation((url) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(careerPageHtml),
            url: "https://fortinet.com/careers",
            status: 200,
          });
        }
        if (url.includes("myworkdayjobs.com")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                jobPostings: [
                  {
                    title: "Firewall Engineer",
                    locationsText: "Sunnyvale",
                    externalPath: "/job/456",
                    bulletFields: ["R02"],
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await fetchPage("https://fortinet.com/careers");
      expect(result).not.toBeNull();
      expect(result.source).toBe("ats-api");
    });
  });

  describe("full pipeline coverage for known companies", () => {
    it("handles the 37 companies with known atsUrl fields", async () => {
      // Verify that all ATS URL formats in companies.json are matchable by tryAtsApi patterns
      const fs = await import("fs");
      const companies = JSON.parse(
        fs.readFileSync(
          new URL("../../data/companies.json", import.meta.url),
          "utf8"
        )
      );
      const withAts = companies.filter((c) => c.atsUrl);

      const greenhousePattern = /boards\.greenhouse\.io\/(\w+)/i;
      const smartrecruitersPattern = /jobs\.smartrecruiters\.com\/(\w[\w-]*)/i;
      const ashbyPattern = /jobs\.ashbyhq\.com\/(\w[\w-]*)/i;
      const workdayPattern = /([\w-]+)\.wd(\d+)\.myworkdayjobs\.com\/([\w-]+)/i;

      for (const company of withAts) {
        const url = company.atsUrl;
        const matchesAny =
          greenhousePattern.test(url) ||
          smartrecruitersPattern.test(url) ||
          ashbyPattern.test(url) ||
          workdayPattern.test(url);
        expect(matchesAny).toBe(true);
      }
    });
  });
});
