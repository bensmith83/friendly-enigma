import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; CyberSecJobAnalyzer/1.0; +https://github.com/bensmith83/friendly-enigma)";

const FETCH_TIMEOUT = 15000;

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
];

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
        Accept: "text/html,application/xhtml+xml",
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
    if (textContent.length < 200 && /<script/i.test(html)) {
      // Likely a JS-rendered SPA - try to find embedded ATS links in the HTML
      const atsUrls = extractAtsUrls(html, url);
      for (const atsUrl of atsUrls) {
        const atsResult = await tryAtsApi(atsUrl);
        if (atsResult) return atsResult;
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
  ];
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    urls.push(...matches);
  }
  return urls;
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
