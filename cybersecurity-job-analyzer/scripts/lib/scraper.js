import * as cheerio from "cheerio";

// Use a realistic browser User-Agent to avoid bot-blocking by career pages
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT = 20000;

const JOB_URL_PATTERNS = [
  /\/careers?\//i,
  /\/jobs?\//i,
  /\/open-?positions?\//i,
  /\/opportunities?\//i,
  /\/hiring\//i,
  /\/work-with-us\//i,
  /\/join-us\//i,
  /\/openings?\//i,
  /greenhouse\.io/i,
  /lever\.co/i,
  /workday\.com/i,
  /smartrecruiters\.com/i,
  /ashbyhq\.com/i,
];

// Try to fetch jobs via known ATS JSON APIs before falling back to HTML scraping.
// Many career pages are JS-rendered SPAs that return empty HTML to fetch(),
// but their underlying ATS platforms expose structured JSON APIs.
const ATS_API_PATTERNS = [
  {
    // Greenhouse embedded JSON API
    match: /boards\.greenhouse\.io\/(\w+)/i,
    toApi: (m) => `https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs`,
    transform: (data) => JSON.stringify({ jobs: (data.jobs || []).map(j => ({
      title: j.title, department: j.departments?.[0]?.name, location: j.location?.name,
      url: j.absolute_url, id: j.id,
    })) }),
  },
  {
    // Lever jobs API
    match: /jobs\.lever\.co\/(\w[\w-]*)/i,
    toApi: (m) => `https://api.lever.co/v0/postings/${m[1]}`,
    transform: (data) => JSON.stringify({ jobs: (Array.isArray(data) ? data : []).map(j => ({
      title: j.text, department: j.categories?.department, location: j.categories?.location,
      url: j.hostedUrl, id: j.id,
    })) }),
  },
  {
    // Ashby jobs API
    match: /jobs\.ashbyhq\.com\/(\w[\w-]*)/i,
    toApi: (m) => `https://api.ashbyhq.com/posting-api/job-board/${m[1]}`,
    transform: (data) => JSON.stringify({ jobs: (data.jobs || []).map(j => ({
      title: j.title, department: j.departmentName, location: j.locationName,
      url: j.jobUrl, id: j.id,
    })) }),
  },
  {
    // SmartRecruiters API
    match: /jobs\.smartrecruiters\.com\/(\w[\w-]*)/i,
    toApi: (m) => `https://api.smartrecruiters.com/v1/companies/${m[1]}/postings`,
    transform: (data) => JSON.stringify({ jobs: (data.content || []).map(j => ({
      title: j.name, department: j.department?.label, location: j.location?.city,
      url: `https://jobs.smartrecruiters.com/${j.company?.identifier}/${j.id}`, id: j.id,
    })) }),
  },
];

// Generate candidate ATS slugs from a company name.
// Most ATS platforms use the company name (lowercase, no spaces) as the board slug.
function generateAtsSlugs(companyName) {
  const base = companyName
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")     // Remove parenthetical like "(Okta)"
    .replace(/[^a-z0-9\s-]/g, "")       // Remove special chars
    .trim();

  const slugs = new Set();
  // "Palo Alto Networks" -> "paloaltonetworks", "palo-alto-networks"
  slugs.add(base.replace(/[\s-]+/g, ""));
  slugs.add(base.replace(/\s+/g, "-"));
  // First word only: "CrowdStrike" -> "crowdstrike"
  const firstWord = base.split(/\s+/)[0];
  if (firstWord.length > 3) slugs.add(firstWord);
  // Without common suffixes: "Nozomi Networks" -> "nozomi"
  const withoutSuffix = base.replace(/\s+(security|networks?|systems?|labs?|inc|io|ai)\s*$/i, "").replace(/\s+/g, "");
  if (withoutSuffix.length > 3) slugs.add(withoutSuffix);

  return [...slugs];
}

// Try to discover a company's job listings via ATS JSON APIs.
// Probes Greenhouse, Lever, and Ashby using slugs derived from the company name.
export async function discoverAtsJobs(companyName, atsUrl) {
  // If an explicit ATS URL is provided, try it first
  if (atsUrl) {
    const result = await tryAtsApi(atsUrl);
    if (result) return result;
  }

  const slugs = generateAtsSlugs(companyName);
  const apis = [
    { name: "greenhouse", toUrl: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
      transform: (data) => JSON.stringify({ jobs: (data.jobs || []).map(j => ({
        title: j.title, department: j.departments?.[0]?.name, location: j.location?.name,
        url: j.absolute_url, id: j.id,
      })) }),
      validate: (data) => Array.isArray(data.jobs),
    },
    { name: "lever", toUrl: (s) => `https://api.lever.co/v0/postings/${s}`,
      transform: (data) => JSON.stringify({ jobs: (Array.isArray(data) ? data : []).map(j => ({
        title: j.text, department: j.categories?.department, location: j.categories?.location,
        url: j.hostedUrl, id: j.id,
      })) }),
      validate: (data) => Array.isArray(data),
    },
    { name: "ashby", toUrl: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`,
      transform: (data) => JSON.stringify({ jobs: (data.jobs || []).map(j => ({
        title: j.title, department: j.departmentName, location: j.locationName,
        url: j.jobUrl, id: j.id,
      })) }),
      validate: (data) => data.jobs !== undefined,
    },
  ];

  for (const slug of slugs) {
    for (const api of apis) {
      try {
        const url = api.toUrl(slug);
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) continue;

        const data = await response.json();
        if (!api.validate(data)) continue;

        const html = api.transform(data);
        // Check the result actually has jobs
        const parsed = JSON.parse(html);
        if (parsed.jobs && parsed.jobs.length > 0) {
          return { html, finalUrl: url, status: response.status, source: `${api.name}-api`, slug };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function tryAtsApi(url) {
  for (const pattern of ATS_API_PATTERNS) {
    const match = url.match(pattern.match);
    if (!match) continue;

    try {
      const apiUrl = pattern.toApi(match);
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!response.ok) continue;

      const data = await response.json();
      const html = pattern.transform(data);
      return { html, finalUrl: url, status: response.status, source: "ats-api" };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchPage(url) {
  // First try ATS API for structured data (avoids JS-rendering issues)
  const atsResult = await tryAtsApi(url);
  if (atsResult) return atsResult;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Check if the page looks like a JS-rendered shell with no real content
    const textContent = html.replace(/<[^>]*>/g, "").trim();
    if (textContent.length < 500 && /<script/i.test(html)) {
      // Try to find embedded ATS links in the HTML
      const atsUrls = extractAtsUrls(html, url);
      for (const atsUrl of atsUrls) {
        const atsResult = await tryAtsApi(atsUrl);
        if (atsResult) return atsResult;
      }

      // Try to extract embedded JSON data (many SPAs embed initial state)
      const embeddedData = extractEmbeddedJobData(html);
      if (embeddedData) {
        return { html: embeddedData, finalUrl: response.url, status: response.status, source: "embedded-json" };
      }
    }

    return { html, finalUrl: response.url, status: response.status };
  } catch {
    return null;
  }
}

function extractAtsUrls(html, baseUrl) {
  const urls = [];
  const patterns = [
    /https?:\/\/boards\.greenhouse\.io\/[\w-]+/gi,
    /https?:\/\/jobs\.lever\.co\/[\w-]+/gi,
    /https?:\/\/jobs\.ashbyhq\.com\/[\w-]+/gi,
    /https?:\/\/[\w-]+\.greenhouse\.io/gi,
    /https?:\/\/jobs\.smartrecruiters\.com\/[\w-]+/gi,
  ];
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    urls.push(...matches);
  }
  return urls;
}

function extractEmbeddedJobData(html) {
  // Many SPAs embed initial data as JSON in script tags (e.g., __NEXT_DATA__, window.__DATA__)
  const jsonPatterns = [
    /__NEXT_DATA__[^>]*>([\s\S]*?)<\/script/i,
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script/i,
    /window\.__DATA__\s*=\s*({[\s\S]*?});?\s*<\/script/i,
    /application\/ld\+json[^>]*>([\s\S]*?)<\/script/i,
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        const data = JSON.parse(match[1]);
        // Check if the JSON contains job-related data
        const str = JSON.stringify(data);
        if (str.includes('"title"') && (str.includes('"location"') || str.includes('"department"'))) {
          return str;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

export function extractJobLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      return;
    }

    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    const isJobLink = JOB_URL_PATTERNS.some((pattern) => pattern.test(absoluteUrl));
    if (isJobLink) {
      links.push({ url: absoluteUrl, title: text || null });
    }
  });

  return links;
}

export function resolveCareerUrl(companyUrl) {
  const base = companyUrl.replace(/\/+$/, "");
  return [
    `${base}/careers`,
    `${base}/jobs`,
    `${base}/careers/`,
    `${base}/jobs/`,
    `${base}/open-positions`,
    `${base}/company/careers`,
    `${base}/about/careers`,
  ];
}
