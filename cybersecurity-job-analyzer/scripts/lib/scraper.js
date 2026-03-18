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

export async function fetchPage(url) {
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
    return { html, finalUrl: response.url, status: response.status };
  } catch {
    return null;
  }
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
