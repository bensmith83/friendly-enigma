# ATS API URL Validation Report

**Date:** 2026-03-22

## Section 1: Companies with Known atsUrl

### Greenhouse (34 companies)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 1 | CrowdStrike | `crowdstrike` | 404 | 0 | Yes | **SLUG NOT FOUND** — not on Greenhouse, Lever, Ashby, or SmartRecruiters |
| 2 | SentinelOne | `sentinelone` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 3 | Huntress | `huntress` | 200 | 24 | Yes | OK |
| 4 | Arctic Wolf | `arcticwolf` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 5 | Wiz | `wizinc` | 200 | 191 | Yes | OK |
| 6 | Snyk | `snyk` | 404 | 0 | Yes | **Found on Ashby** (`snyk`) but returned 0 jobs — possible hiring freeze |
| 7 | Aqua Security | `aquasecurity` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 8 | Tenable | `tenableinc` | 200 | 65 | Yes | OK |
| 9 | Orca Security | `orcasecurity` | 200 | 17 | Yes | OK |
| 10 | Okta | `okta` | 200 | 366 | Yes | OK |
| 11 | JumpCloud | `jumpcloud` | 404 | 0 | Yes | **Found on Lever** (`jumpcloud`) — 21 jobs |
| 12 | Zscaler | `zscaler` | 200 | 281 | Yes | OK |
| 13 | Cloudflare | `cloudflare` | 200 | 556 | Yes | OK |
| 14 | Abnormal Security | `abnormalsecurity` | 200 | 111 | Yes | OK |
| 15 | Exabeam | `exabeam` | 200 | **0** | Yes | **0 JOBS** — slug works but no active postings (hiring freeze?) |
| 16 | Recorded Future | `recordedfuture` | 200 | 38 | Yes | OK |
| 17 | Flashpoint | `flashpoint` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 18 | Checkmarx | `checkmarx` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 19 | Veracode | `veracode` | 200 | 19 | Yes | OK |
| 20 | GitLab | `gitlab` | 200 | 163 | Yes | OK |
| 21 | Semgrep | `semgrep` | 404 | 0 | Yes | **Found on Ashby** (`semgrep`) — 34 jobs |
| 22 | Contrast Security | `contrastsecurity` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 23 | Varonis | `varonis` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 24 | Imperva | `imperva` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 25 | BigID | `bigid` | 200 | 38 | Yes | OK |
| 26 | Securiti.ai | `securitiai` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 27 | Cybereason | `cybereason` | 200 | 7 | Yes | OK (low count — may be winding down) |
| 28 | Fortanix | `fortanix` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 29 | Claroty | `claroty` | 404 | 0 | Yes | **SLUG NOT FOUND** — not found on any tested platform |
| 30 | Nozomi Networks | `nozominetworks` | 200 | 17 | Yes | OK |
| 31 | Dragos | `dragos` | 200 | 20 | Yes | OK |
| 32 | Vanta | `vanta` | 404 | 0 | Yes | **Found on Ashby** (`vanta`) — 184 jobs |
| 33 | Secureframe | `secureframe` | 404 | 0 | Yes | **Found on Lever** (`secureframe`) — 16 jobs |
| 34 | OneTrust | `onetrust` | 200 | 77 | Yes | OK |

### SmartRecruiters (1 company)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 35 | Palo Alto Networks | `PaloAltoNetworks` | 200 | **0** | Yes | **0 JOBS** — totalFound=0; may use a different slug or have migrated ATS |

### Ashby (2 companies)

| # | Company | Slug | HTTP Status | Jobs Found | Valid JSON | Notes |
|---|---------|------|:-----------:|:----------:|:----------:|-------|
| 36 | Censys | `censys` | 404 | — | No | **SLUG NOT FOUND** — also tried `censys-io`, `censysio`; may have migrated ATS |
| 37 | Drata | `drata` | 200 | 18 | Yes | OK |

---

## Section 2: Slug Discovery (No Known atsUrl)

| # | Company | Winning Slug | Platform | HTTP Status | Jobs Found | Notes |
|---|---------|-------------|----------|:-----------:|:----------:|-------|
| 38 | Rapid7 | — | — | 404 | 0 | **NOT FOUND** on Greenhouse (`rapid7`, `rapid-7`, `rapid7inc`) or Lever (`rapid7`) |
| 39 | Elastic Security | `elastic` | Greenhouse | 200 | 218 | OK — slug `elastic` works |
| 40 | Microsoft Security | — | — | 404 | 0 | **NOT FOUND** — too large for standard ATS boards; uses custom careers site |
| 41 | Fortinet | — | — | — | 0 | **NOT FOUND** on Greenhouse or SmartRecruiters; uses custom careers site |
| 42 | Splunk | — | — | 404 | 0 | **NOT FOUND** — acquired by Cisco; likely uses Cisco's ATS now |
| 43 | Datadog | `datadog` | Greenhouse | 200 | 457 | OK — slug `datadog` works |
| 44 | Rubrik | `rubrik` | Greenhouse | 200 | 205 | OK — slug `rubrik` works |
| 45 | Cato Networks | `catonetworks` | Greenhouse | 200 | 162 | OK — slug `catonetworks` works |
| 46 | ServiceNow GRC | `ServiceNow` | SmartRecruiters | 200 | 100 | OK — returns 100 postings (likely paginated; may have more) |
| 47 | Trellix | — | — | 404 | 0 | **NOT FOUND** on Greenhouse or Lever; may use custom ATS post-McAfee/FireEye merger |

---

## Summary Statistics

| Category | Count |
|----------|:-----:|
| **Working (jobs > 0)** | 25 |
| **Working but 0 jobs (possible hiring freeze)** | 3 (Exabeam, Palo Alto Networks, Snyk on Ashby) |
| **Wrong platform — found elsewhere** | 4 (JumpCloud→Lever, Semgrep→Ashby, Vanta→Ashby, Secureframe→Lever) |
| **Slug not found on any platform** | 15 |

## Recommended atsUrl Updates

Companies that need their `atsUrl` corrected to a different platform:

| Company | Current (broken) atsUrl platform | Correct atsUrl | Jobs |
|---------|--------------------------------|----------------|:----:|
| JumpCloud | Greenhouse | `https://api.lever.co/v0/postings/jumpcloud` | 21 |
| Semgrep | Greenhouse | `https://api.ashbyhq.com/posting-api/job-board/semgrep` | 34 |
| Vanta | Greenhouse | `https://api.ashbyhq.com/posting-api/job-board/vanta` | 184 |
| Secureframe | Greenhouse | `https://api.lever.co/v0/postings/secureframe` | 16 |

## New atsUrl Discoveries (previously unknown)

| Company | Discovered atsUrl | Platform | Jobs |
|---------|------------------|----------|:----:|
| Elastic Security | `https://boards-api.greenhouse.io/v1/boards/elastic/jobs` | Greenhouse | 218 |
| Datadog | `https://boards-api.greenhouse.io/v1/boards/datadog/jobs` | Greenhouse | 457 |
| Rubrik | `https://boards-api.greenhouse.io/v1/boards/rubrik/jobs` | Greenhouse | 205 |
| Cato Networks | `https://boards-api.greenhouse.io/v1/boards/catonetworks/jobs` | Greenhouse | 162 |
| ServiceNow GRC | `https://api.smartrecruiters.com/v1/companies/ServiceNow/postings` | SmartRecruiters | 100+ |

## Flagged Issues

1. **CrowdStrike, SentinelOne, Arctic Wolf** — Major cybersecurity companies not found on any standard ATS API. Likely use Workday, iCIMS, or custom career portals.
2. **Palo Alto Networks** — SmartRecruiters slug exists but returns 0 postings. May have migrated to a different ATS.
3. **Censys** — Previously on Ashby but now returns 404. May have switched ATS providers.
4. **Exabeam** — Greenhouse slug works but 0 active jobs. Possible hiring freeze or acquisition-related pause.
5. **Snyk** — Ashby board exists but 0 jobs. May have moved ATS or paused hiring.
6. **Microsoft, Fortinet, Splunk, Rapid7, Trellix** — Large companies that use enterprise ATS systems (Workday, iCIMS, etc.) not accessible via simple public APIs.
7. **ServiceNow** — Returns exactly 100 results, suggesting pagination. Use `?offset=100` to get more.
