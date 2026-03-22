# ATS API URL Validation Report

**Date:** 2026-03-22

## Section 1: Companies with Known atsUrl

### Greenhouse (34 companies)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 1 | CrowdStrike | `crowdstrike` | 404 | 0 | Yes | Wrong slug — see Section 3 |
| 2 | SentinelOne | `sentinelone` | 404 | 0 | Yes | Wrong slug — see Section 3 |
| 3 | Huntress | `huntress` | 200 | 24 | Yes | OK |
| 4 | Arctic Wolf | `arcticwolf` | 404 | 0 | Yes | Wrong platform — see Section 3 |
| 5 | Wiz | `wizinc` | 200 | 191 | Yes | OK |
| 6 | Snyk | `snyk` | 404 | 0 | Yes | Wrong platform — see Section 3 |
| 7 | Aqua Security | `aquasecurity` | 404 | 0 | Yes | Wrong platform — see Section 3 |
| 8 | Tenable | `tenableinc` | 200 | 65 | Yes | OK |
| 9 | Orca Security | `orcasecurity` | 200 | 17 | Yes | OK |
| 10 | Okta | `okta` | 200 | 366 | Yes | OK |
| 11 | JumpCloud | `jumpcloud` | 404 | 0 | Yes | **Found on Lever** (`jumpcloud`) — 21 jobs |
| 12 | Zscaler | `zscaler` | 200 | 281 | Yes | OK |
| 13 | Cloudflare | `cloudflare` | 200 | 556 | Yes | OK |
| 14 | Abnormal Security | `abnormalsecurity` | 200 | 111 | Yes | OK |
| 15 | Exabeam | `exabeam` | 200 | **0** | Yes | Migrated to Jobvite — see Section 3 |
| 16 | Recorded Future | `recordedfuture` | 200 | 38 | Yes | OK |
| 17 | Flashpoint | `flashpoint` | 404 | 0 | Yes | **Found on Ashby** (`flashpoint.io`) — 13 jobs |
| 18 | Checkmarx | `checkmarx` | 404 | 0 | Yes | Wrong platform — see Section 3 |
| 19 | Veracode | `veracode` | 200 | 19 | Yes | OK |
| 20 | GitLab | `gitlab` | 200 | 163 | Yes | OK |
| 21 | Semgrep | `semgrep` | 404 | 0 | Yes | **Found on Ashby** (`semgrep`) — 34 jobs |
| 22 | Contrast Security | `contrastsecurity` | 404 | 0 | Yes | **Found on Ashby** (`contrast-security`) — 5 jobs |
| 23 | Varonis | `varonis` | 404 | 0 | Yes | Uses Jobvite (auth required) — see Section 3 |
| 24 | Imperva | `imperva` | 404 | 0 | Yes | Acquired by Thales; uses Phenom (auth required) — see Section 3 |
| 25 | BigID | `bigid` | 200 | 38 | Yes | OK |
| 26 | Securiti.ai | `securitiai` | 404 | 0 | Yes | Uses Freshteam (auth required) — see Section 3 |
| 27 | Cybereason | `cybereason` | 200 | 7 | Yes | OK (low count — may be winding down) |
| 28 | Fortanix | `fortanix` | 404 | 0 | Yes | **Found on Workable** — 15 jobs |
| 29 | Claroty | `claroty` | 404 | 0 | Yes | **Found on Comeet** — 38 jobs |
| 30 | Nozomi Networks | `nozominetworks` | 200 | 17 | Yes | OK |
| 31 | Dragos | `dragos` | 200 | 20 | Yes | OK |
| 32 | Vanta | `vanta` | 404 | 0 | Yes | **Found on Ashby** (`vanta`) — 184 jobs |
| 33 | Secureframe | `secureframe` | 404 | 0 | Yes | **Found on Lever** (`secureframe`) — 16 jobs |
| 34 | OneTrust | `onetrust` | 200 | 77 | Yes | OK |

### SmartRecruiters (1 company)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 35 | Palo Alto Networks | `PaloAltoNetworks` | 200 | **0** | Yes | Migrated to TalentBrew/Radancy — see Section 3 |

### Ashby (2 companies)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 36 | Censys | `censys` (Ashby) | 404 | — | No | **Found on Greenhouse** (`censys`) — 9 jobs |
| 37 | Drata | `drata` | 200 | 18 | Yes | OK |

---

## Section 2: Slug Discovery (No Known atsUrl)

| # | Company | Winning Slug | Platform | HTTP Status | Jobs Found | Notes |
|---|---------|-------------|----------|:-----------:|:----------:|-------|
| 38 | Rapid7 | — | Custom Rails app | 200 | unknown | JS-rendered; no public JSON API — see Section 3 |
| 39 | Elastic Security | `elastic` | Greenhouse | 200 | 218 | OK — slug `elastic` works |
| 40 | Microsoft Security | — | Custom (Adobe AEM) | — | 10,000+ | No public JSON API — see Section 3 |
| 41 | Fortinet | — | Oracle HCM Cloud | 200 | 3+ | Partially working API — see Section 3 |
| 42 | Splunk | `splunk` (search filter) | Cisco Phenom widget | 200 | 925 (all Cisco) | Use `searchText: "splunk"` filter — see Section 3 |
| 43 | Datadog | `datadog` | Greenhouse | 200 | 457 | OK — slug `datadog` works |
| 44 | Rubrik | `rubrik` | Greenhouse | 200 | 205 | OK — slug `rubrik` works |
| 45 | Cato Networks | `catonetworks` | Greenhouse | 200 | 162 | OK — slug `catonetworks` works |
| 46 | ServiceNow GRC | `ServiceNow` | SmartRecruiters | 200 | 100 | OK — paginated; use `?offset=100` for more |
| 47 | Trellix | `EnterpriseCareers` | Workday | 200 | 90 | Found on Workday — see Section 3 |

---

## Section 3: Deep Dive — Resolved Flagged Issues

### Companies Successfully Resolved with Public JSON APIs

| Company | ATS Platform | API Endpoint | Jobs | Auth Required? |
|---------|-------------|-------------|:----:|:--------------:|
| CrowdStrike | **Workday** | `POST https://crowdstrike.wd5.myworkdayjobs.com/wday/cxs/crowdstrike/crowdstrikecareers/jobs` | 677 | No |
| SentinelOne | **Greenhouse** | `GET https://boards-api.greenhouse.io/v1/boards/sentinellabs/jobs` | 174 | No |
| Arctic Wolf | **Workday** | `POST https://arcticwolf.wd1.myworkdayjobs.com/wday/cxs/arcticwolf/External/jobs` | 91 | No |
| Snyk | **Workday** | Workday tenant identified but exact site name TBD (page references both Workday and Greenhouse) | — | No |
| Aqua Security | **Comeet** | `GET https://www.comeet.co/careers-api/2.0/company/91.001/positions?token=191644966966644E194B3191644644` | 13 | No (token in page) |
| Checkmarx | **Comeet** | `GET https://www.comeet.co/careers-api/2.0/company/C0.008/positions?token=C8320190002581902584B0708` | 35 | No (token in page) |
| Claroty | **Comeet** | `GET https://www.comeet.co/careers-api/2.0/company/F2.004/positions?token=2F4EC42F42F45E814AC1A945E814AC5E8` | 38 | No (token in page) |
| Fortanix | **Workable** | `GET https://apply.workable.com/api/v1/widget/accounts/fortanix` | 15 | No |
| Flashpoint | **Ashby** | `GET https://api.ashbyhq.com/posting-api/job-board/flashpoint.io` | 13 | No |
| Contrast Security | **Ashby** | `GET https://api.ashbyhq.com/posting-api/job-board/contrast-security` | 5 | No |
| Censys | **Greenhouse** | `GET https://boards-api.greenhouse.io/v1/boards/censys/jobs` | 9 | No |
| Trellix | **Workday** | `POST https://trellix.wd1.myworkdayjobs.com/wday/cxs/trellix/EnterpriseCareers/jobs` | 90 | No |
| Splunk/Cisco | **Phenom widget** | `POST https://careers.cisco.com/widgets` (body: `{"searchText":"splunk",...}`) | 925+ | No |
| Exabeam | **Jobvite** | `https://jobs.jobvite.com/exabeam/` (HTML scraping required) | ~10 | N/A (no public API) |
| Palo Alto Networks | **TalentBrew/Radancy** | `https://jobs.paloaltonetworks.com/en/search-jobs/results?ReturnType=json` | 1,035+ | No (but returns HTML-in-JSON) |

### Companies with Auth-Required or No Public API

| Company | ATS Platform | Careers URL | Scraping Method |
|---------|-------------|-------------|-----------------|
| Varonis | **Jobvite** | `https://jobs.jobvite.com/varonis-internal/jobs` | HTML scraping (API requires key from Jobvite) |
| Imperva/Thales | **Phenom** | `https://careers.thalesgroup.com/` | HTML scraping (API requires OAuth from Phenom) |
| Securiti.ai | **Freshteam** | `https://securiti.freshteam.com/jobs` | HTML scraping (API requires auth) |
| Rapid7 | **Pinpoint + Greenhouse** | `https://careers.rapid7.com/jobs/search` | HTML scraping (server-rendered Turbo/Stimulus; Greenhouse board not public) |
| Microsoft | **Custom (Adobe AEM)** | `https://careers.microsoft.com/v2/global/en/search` | HTML scraping or custom API discovery needed |
| Fortinet | **Oracle HCM Cloud** | `https://edel.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&finder=findReqs;siteNumber=CX_1001,limit=25,sortBy=POSTING_DATES_DESC` | API works but returns limited results (3 found) |

---

## Workday API Usage Notes

For CrowdStrike, Arctic Wolf, and Trellix (all Workday), the API pattern is:

```bash
curl -s -X POST \
  "https://{tenant}.{wd_instance}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs" \
  -H "Content-Type: application/json" \
  -d '{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}'
```

**Known Workday configurations:**

| Company | Tenant | WD Instance | Site ID | Total Jobs |
|---------|--------|-------------|---------|:----------:|
| CrowdStrike | `crowdstrike` | `wd5` | `crowdstrikecareers` | 677 |
| Arctic Wolf | `arcticwolf` | `wd1` | `External` | 91 |
| Trellix | `trellix` | `wd1` | `EnterpriseCareers` | 90 |

Workday API supports:
- Pagination via `limit` and `offset`
- Text search via `searchText`
- Faceted filtering via `appliedFacets` (job family, location, type)
- No authentication required

---

## Comeet API Usage Notes

For Aqua Security, Checkmarx, and Claroty (all Comeet/Spark Hire):

```bash
curl -s "https://www.comeet.co/careers-api/2.0/company/{company_uid}/positions?token={token}"
```

**Known Comeet configurations:**

| Company | Company UID | Token | Jobs |
|---------|------------|-------|:----:|
| Aqua Security | `91.001` | `191644966966644E194B3191644644` | 13 |
| Checkmarx | `C0.008` | `C8320190002581902584B0708` | 35 |
| Claroty | `F2.004` | `2F4EC42F42F45E814AC1A945E814AC5E8` | 38 |

Token and UID are embedded in the careers page source (WordPress Comeet plugin). No server-side auth needed.

---

## Summary Statistics

| Category | Count |
|----------|:-----:|
| **Working with public JSON API** | 33 |
| **HTML scraping required** | 6 (Varonis, Imperva, Securiti.ai, Rapid7, Microsoft, Exabeam) |
| **Partial API (limited results)** | 1 (Fortinet — Oracle HCM returns only 3 jobs) |

## Complete Recommended atsUrl Updates

| Company | Old atsUrl | New atsUrl | Platform | Jobs |
|---------|-----------|-----------|----------|:----:|
| CrowdStrike | Greenhouse `crowdstrike` | `POST crowdstrike.wd5.myworkdayjobs.com/.../crowdstrikecareers/jobs` | Workday | 677 |
| SentinelOne | Greenhouse `sentinelone` | `GET boards-api.greenhouse.io/v1/boards/sentinellabs/jobs` | Greenhouse | 174 |
| Arctic Wolf | Greenhouse `arcticwolf` | `POST arcticwolf.wd1.myworkdayjobs.com/.../External/jobs` | Workday | 91 |
| Aqua Security | Greenhouse `aquasecurity` | `GET comeet.co/careers-api/2.0/company/91.001/positions?token=...` | Comeet | 13 |
| JumpCloud | Greenhouse `jumpcloud` | `GET api.lever.co/v0/postings/jumpcloud` | Lever | 21 |
| Flashpoint | Greenhouse `flashpoint` | `GET api.ashbyhq.com/posting-api/job-board/flashpoint.io` | Ashby | 13 |
| Checkmarx | Greenhouse `checkmarx` | `GET comeet.co/careers-api/2.0/company/C0.008/positions?token=...` | Comeet | 35 |
| Semgrep | Greenhouse `semgrep` | `GET api.ashbyhq.com/posting-api/job-board/semgrep` | Ashby | 34 |
| Contrast Security | Greenhouse `contrastsecurity` | `GET api.ashbyhq.com/posting-api/job-board/contrast-security` | Ashby | 5 |
| Claroty | Greenhouse `claroty` | `GET comeet.co/careers-api/2.0/company/F2.004/positions?token=...` | Comeet | 38 |
| Fortanix | Greenhouse `fortanix` | `GET apply.workable.com/api/v1/widget/accounts/fortanix` | Workable | 15 |
| Vanta | Greenhouse `vanta` | `GET api.ashbyhq.com/posting-api/job-board/vanta` | Ashby | 184 |
| Secureframe | Greenhouse `secureframe` | `GET api.lever.co/v0/postings/secureframe` | Lever | 16 |
| Palo Alto Networks | SmartRecruiters | TalentBrew (HTML-in-JSON) — see notes | Radancy | 1,035+ |
| Censys | Ashby `censys` | `GET boards-api.greenhouse.io/v1/boards/censys/jobs` | Greenhouse | 9 |
| Exabeam | Greenhouse `exabeam` (0 jobs) | Jobvite HTML scraping | Jobvite | ~10 |
| Trellix | Not found | `POST trellix.wd1.myworkdayjobs.com/.../EnterpriseCareers/jobs` | Workday | 90 |

## New Platform Types Discovered

This investigation uncovered **8 ATS platforms** beyond the original 4 (Greenhouse, Lever, Ashby, SmartRecruiters):

1. **Workday** — CrowdStrike, Arctic Wolf, Trellix (POST JSON API, no auth)
2. **Comeet/Spark Hire** — Aqua Security, Checkmarx, Claroty (GET JSON API, token from page)
3. **Workable** — Fortanix (GET JSON API, no auth)
4. **TalentBrew/Radancy** — Palo Alto Networks (AJAX endpoint, HTML-in-JSON)
5. **Jobvite** — Exabeam, Varonis (no public JSON API)
6. **Freshteam** — Securiti.ai (no public JSON API)
7. **Phenom** — Imperva/Thales (OAuth required)
8. **Oracle HCM Cloud** — Fortinet (REST API, limited results)
