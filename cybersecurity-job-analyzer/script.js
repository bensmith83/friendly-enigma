const CONFIG = {
  analysisUrl: "data/analysis.json",
  companiesUrl: "data/companies.json",
  cacheKey: "cybersec-jobs-cache-v1",
  cacheExpiry: 24 * 60 * 60 * 1000,
};

let state = {
  analysis: null,
  companies: null,
  activeFilter: "all",
};

// --- Data Loading ---

async function loadData() {
  const cached = loadFromCache();
  if (cached) {
    state.analysis = cached.analysis;
    state.companies = cached.companies;
    render();
    return;
  }

  showLoading(true);
  try {
    const [analysisRes, companiesRes] = await Promise.allSettled([
      fetch(CONFIG.analysisUrl),
      fetch(CONFIG.companiesUrl),
    ]);

    if (analysisRes.status === "fulfilled" && analysisRes.value.ok) {
      state.analysis = await analysisRes.value.json();
    }
    if (companiesRes.status === "fulfilled" && companiesRes.value.ok) {
      state.companies = await companiesRes.value.json();
    }

    if (state.analysis) {
      saveToCache({ analysis: state.analysis, companies: state.companies });
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  }

  showLoading(false);
  render();
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) {
      return null;
    }
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CONFIG.cacheExpiry) {
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function saveToCache(data) {
  try {
    localStorage.setItem(
      CONFIG.cacheKey,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {
    // Storage full or unavailable
  }
}

function showLoading(show) {
  document.getElementById("loadingState").style.display = show
    ? "block"
    : "none";
}

// --- Rendering ---

function render() {
  if (!state.analysis || !state.analysis.companies) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  // Build a lookup of company metadata from companies.json
  const companyMeta = new Map();
  if (state.companies && Array.isArray(state.companies)) {
    for (const comp of state.companies) {
      companyMeta.set(comp.name, comp);
    }
  }

  // Enrich analysis entries with metadata from companies.json
  const analysisMap = new Map();
  for (const c of state.analysis.companies) {
    const meta = companyMeta.get(c.company);
    if (meta) {
      c.description = meta.description;
      c.careerUrlVerified = meta.careerUrlVerified;
      c.careerUrl = meta.careerUrl;
    }
    analysisMap.set(c.company, c);
  }

  // Add companies from companies.json that aren't in analysis
  for (const comp of companyMeta.values()) {
    if (!analysisMap.has(comp.name)) {
      state.analysis.companies.push({
        company: comp.name,
        category: comp.category,
        website: comp.website,
        description: comp.description,
        careerUrlVerified: comp.careerUrlVerified,
        careerUrl: comp.careerUrl,
        jobCount: 0,
        strategy: { signals: [], newProductAreas: [], technologyTrends: [], teamExpansion: [] },
        financial: { healthScore: null, trend: "unknown", riskLevel: "unknown", signals: [], alerts: [] },
      });
    }
  }

  document.getElementById("emptyState").style.display = "none";
  renderLastUpdated();
  renderStats();
  renderTechCloud();
  renderAlerts();
  renderCategoryFilters();
  renderCompanyGrid();
  renderSalary();
  renderReports();
}

function renderLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (state.analysis.date) {
    el.textContent = `Last updated: ${formatDate(state.analysis.date)}`;
  }
}

function renderStats() {
  const companies = state.analysis.companies;
  const totalJobs = companies.reduce((sum, c) => sum + (c.jobCount || 0), 0);
  const companiesWithHealth = companies.filter((c) => c.financial?.healthScore != null);
  const avgHealth = companiesWithHealth.length > 0
    ? companiesWithHealth.reduce((sum, c) => sum + c.financial.healthScore, 0) / companiesWithHealth.length
    : 0;
  const alertCount = companies.reduce(
    (sum, c) => sum + (c.financial?.alerts?.length || 0),
    0
  );
  const growingCount = companies.filter(
    (c) => c.financial?.trend === "growing"
  ).length;

  document.getElementById("statsRow").innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Companies Tracked</div>
      <div class="stat-value">${companies.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Open Positions</div>
      <div class="stat-value">${totalJobs.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Health Score</div>
      <div class="stat-value">${avgHealth.toFixed(1)}<span style="font-size:0.9rem;color:var(--text-muted)">/10</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Growing Companies</div>
      <div class="stat-value stat-change positive">${growingCount}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Alerts</div>
      <div class="stat-value" style="color:${alertCount > 0 ? "var(--red)" : "var(--green)"}">${alertCount}</div>
    </div>
  `;
}

function renderTechCloud() {
  const section = document.getElementById("techCloudSection");
  const companies = state.analysis.companies;

  // Aggregate technology mentions across all companies
  const techCounts = new Map();
  for (const company of companies) {
    const techs = company.strategy?.technologyTrends || [];
    for (const tech of techs) {
      const key = tech.toLowerCase().trim();
      if (!key) {
        continue;
      }
      const existing = techCounts.get(key) || { name: tech, count: 0, companies: [] };
      existing.count++;
      existing.companies.push(company.company);
      techCounts.set(key, existing);
    }
  }

  if (techCounts.size === 0) {
    section.innerHTML = "";
    return;
  }

  const techs = Array.from(techCounts.values()).sort((a, b) => b.count - a.count);
  const maxCount = techs[0].count;
  const minCount = techs[techs.length - 1].count;

  // Color palette for the cloud
  const colors = [
    "var(--accent)", "var(--green)", "var(--purple)",
    "var(--orange)", "#f778ba", "#79c0ff", "#d2a8ff",
    "#7ee787", "#ffa657", "#ff7b72",
  ];

  const words = techs.map((tech, i) => {
    // Scale font size between 0.7rem and 2.2rem based on frequency
    const ratio = maxCount === minCount ? 0.5 : (tech.count - minCount) / (maxCount - minCount);
    const fontSize = 0.7 + ratio * 1.5;
    const opacity = 0.5 + ratio * 0.5;
    const color = colors[i % colors.length];
    const companiesList = [...new Set(tech.companies)].join(", ");

    return `<span class="tech-word" style="font-size:${fontSize}rem;color:${color};opacity:${opacity};font-weight:${ratio > 0.5 ? 600 : 400}">${escapeHtml(tech.name)}<span class="tech-tooltip">${tech.count} ${tech.count === 1 ? "company" : "companies"}: ${escapeHtml(companiesList)}</span></span>`;
  });

  section.innerHTML = `
    <div class="tech-cloud">
      <h2 class="section-header" style="border:none;margin-bottom:0">Technology Landscape</h2>
      <div class="tech-cloud-words">${words.join("")}</div>
    </div>
  `;
}

function renderAlerts() {
  const alerts = [];
  for (const company of state.analysis.companies) {
    const companyAlerts = company.financial?.alerts || [];
    const companySignals = company.financial?.signals || [];
    for (const alert of companyAlerts) {
      alerts.push({
        company: company.company,
        category: company.category,
        alert,
        jobCount: company.jobCount || 0,
        healthScore: company.financial?.healthScore,
        trend: company.financial?.trend || "unknown",
        signals: companySignals,
      });
    }
  }

  const section = document.getElementById("alertsSection");
  if (alerts.length === 0) {
    section.innerHTML = "";
    return;
  }

  section.innerHTML = `
    <h2 class="section-header" style="color:var(--red)">Alerts (${alerts.length})</h2>
    ${alerts
      .map(
        (a, i) => `
      <div class="alert-item alert-expandable" onclick="this.classList.toggle('expanded')">
        <div class="alert-summary">
          <span class="alert-company">${escapeHtml(a.company)}</span>: ${escapeHtml(a.alert)}
          <span class="alert-toggle">&#9660;</span>
        </div>
        <div class="alert-details">
          <div class="alert-context">
            <strong>Why this alert:</strong> ${escapeHtml(a.company)} (${escapeHtml(a.category)}) has ${a.jobCount} open positions.
            Health score: ${a.healthScore != null ? a.healthScore + "/10" : "N/A"}.
            Trend: ${escapeHtml(a.trend)}.
          </div>
          ${a.signals.length > 0 ? `
          <div class="alert-context">
            <strong>Supporting signals:</strong>
            <ul>${a.signals.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
          </div>` : ""}
        </div>
      </div>
    `
      )
      .join("")}
  `;
}

function renderCategoryFilters() {
  const categories = [
    ...new Set(state.analysis.companies.map((c) => c.category).filter(Boolean)),
  ];
  const container = document.getElementById("categoryFilters");

  container.innerHTML = `
    <button class="filter-btn ${state.activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>
    ${categories
      .map(
        (cat) => `
      <button class="filter-btn ${state.activeFilter === cat ? "active" : ""}" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
    `
      )
      .join("")}
  `;

  container.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeFilter = btn.dataset.filter;
      renderCategoryFilters();
      renderCompanyGrid();
    });
  });
}

function renderCompanyGrid() {
  let companies = state.analysis.companies;
  if (state.activeFilter !== "all") {
    companies = companies.filter((c) => c.category === state.activeFilter);
  }

  // Sort: companies with jobs first, then by health score descending
  companies.sort((a, b) => {
    const aHasJobs = (a.jobCount || 0) > 0 ? 1 : 0;
    const bHasJobs = (b.jobCount || 0) > 0 ? 1 : 0;
    if (aHasJobs !== bHasJobs) return bHasJobs - aHasJobs;
    return (b.financial?.healthScore || 0) - (a.financial?.healthScore || 0);
  });

  const grid = document.getElementById("companyGrid");
  grid.innerHTML = companies.map((c) => renderCompanyCard(c)).join("");
}

function getScrapingStatus(company) {
  if ((company.jobCount || 0) > 0) return null;
  if (!company.careerUrlVerified || !company.careerUrl) {
    return "No career page URL found — scraper cannot reach this company's job listings";
  }
  return "Career page is JS-rendered or blocked — scraper returned no listings";
}

function renderCompanyCard(company) {
  const health = company.financial || {};
  const strategy = company.strategy || {};
  const riskClass = getRiskClass(health.riskLevel);
  const trendArrow = getTrendArrow(health.trend);

  const signals = (strategy.signals || []).slice(0, 3);
  const techTrends = (strategy.technologyTrends || []).slice(0, 5);
  const hasData = (company.jobCount || 0) > 0;
  const scrapingStatus = getScrapingStatus(company);

  return `
    <div class="company-card${hasData ? "" : " no-data"}">
      <div class="company-header">
        <div class="company-name">
          <a href="${escapeHtml(company.website || "#")}" target="_blank" rel="noopener">${escapeHtml(company.company)}</a>
        </div>
        <span class="health-badge ${riskClass}">${escapeHtml(health.riskLevel || "unknown")} risk</span>
      </div>
      <div class="company-meta">${escapeHtml(company.category || "Cybersecurity")}</div>
      ${company.description ? `<div class="company-description">${escapeHtml(company.description)}</div>` : ""}
      <div class="company-stats">
        <div><span class="company-stat-value">${company.jobCount || 0}</span> jobs</div>
        <div>Health: <span class="company-stat-value">${health.healthScore != null ? health.healthScore : "—"}</span>${health.healthScore != null ? "/10" : ""}</div>
        <div>Trend: ${trendArrow} ${escapeHtml(health.trend || "unknown")}</div>
      </div>
      ${
        scrapingStatus
          ? `<div class="scraping-status" title="${escapeHtml(scrapingStatus)}">
              <span class="status-icon">&#9888;</span> ${escapeHtml(scrapingStatus)}
            </div>`
          : ""
      }
      ${
        signals.length > 0
          ? `<div class="signals-list">
          ${signals
            .map(
              (s) =>
                `<div class="signal-item"><span class="confidence-${s.confidence || "low"}">[${s.confidence || "?"}]</span> ${escapeHtml(s.signal)}</div>`
            )
            .join("")}
        </div>`
          : ""
      }
      ${
        techTrends.length > 0
          ? `<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted)">Tech: ${techTrends.map((t) => escapeHtml(t)).join(", ")}</div>`
          : ""
      }
    </div>
  `;
}

function renderSalary() {
  const salary = state.analysis.salaryReport;
  if (!salary || salary.note) {
    const companiesScraped = state.analysis.companies.filter(c => (c.jobCount || 0) > 0).length;
    const totalCompanies = state.analysis.companies.length;
    document.getElementById("salaryStats").innerHTML = "";
    document.getElementById("salaryGrid").innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(salary?.note || "No salary data available yet")}</p>
        <p class="hint">Currently ${companiesScraped} of ${totalCompanies} companies returned job listings. Most career pages use JavaScript rendering that the scraper cannot process yet. Salary data will appear once more companies' listings are successfully scraped and include compensation details.</p>
      </div>
    `;
    document.getElementById("topPaying").innerHTML = "";
    return;
  }

  document.getElementById("salaryStats").innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Overall Median Salary</div>
      <div class="stat-value" style="color:var(--green)">${salary.overallMedian ? "$" + salary.overallMedian.toLocaleString() : "N/A"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Categories Tracked</div>
      <div class="stat-value">${(salary.byCategory || []).length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Highest Salary</div>
      <div class="stat-value" style="color:var(--green)">${getHighestSalary(salary)}</div>
    </div>
  `;

  const categories = salary.byCategory || [];
  document.getElementById("salaryGrid").innerHTML = categories
    .sort((a, b) => (b.median || 0) - (a.median || 0))
    .map(
      (cat) => `
      <div class="salary-card">
        <div class="salary-category">${escapeHtml(cat.category)}</div>
        <div class="salary-range">$${(cat.avgMin || 0).toLocaleString()} - $${(cat.avgMax || 0).toLocaleString()}</div>
        <div class="salary-details">
          Median: $${(cat.median || 0).toLocaleString()} | ${cat.count || 0} positions
        </div>
      </div>
    `
    )
    .join("");

  const topPaying = salary.topPaying || [];
  document.getElementById("topPaying").innerHTML = topPaying
    .map(
      (t) => `
      <div class="salary-card">
        <div class="salary-category">${escapeHtml(t.title)}</div>
        <div class="salary-range">Up to $${(t.salaryMax || 0).toLocaleString()}</div>
        <div class="salary-details">${escapeHtml(t.company || "Unknown")}</div>
      </div>
    `
    )
    .join("");
}

function renderReports() {
  const report = state.analysis;
  const list = document.getElementById("reportList");

  // Current report
  list.innerHTML = `
    <div class="report-card" onclick="this.classList.toggle('expanded')">
      <div class="report-date">${formatDate(report.date)} (Latest)</div>
      <div class="report-summary">${escapeHtml(truncate(report.summary || "No summary available", 300))}</div>
      <div class="report-details">
        <div style="white-space:pre-wrap;line-height:1.8">${escapeHtml(report.summary || "")}</div>
      </div>
    </div>
  `;
}

// --- Helpers ---

function getRiskClass(level) {
  const map = { low: "health-low", medium: "health-medium", high: "health-high", critical: "health-critical", unknown: "health-unknown" };
  return map[level] || "health-unknown";
}

function getTrendArrow(trend) {
  const map = { growing: '<span style="color:var(--green)">&#9650;</span>', stable: '<span style="color:var(--text-muted)">&#9654;</span>', declining: '<span style="color:var(--red)">&#9660;</span>', volatile: '<span style="color:var(--orange)">&#9670;</span>' };
  return map[trend] || "";
}

function getHighestSalary(salary) {
  const top = (salary.topPaying || [])[0];
  return top ? "$" + (top.salaryMax || 0).toLocaleString() : "N/A";
}

function formatDate(dateStr) {
  if (!dateStr) {
    return "Unknown";
  }
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function truncate(str, len) {
  if (str.length <= len) {
    return str;
  }
  return str.substring(0, len) + "...";
}

function escapeHtml(str) {
  if (!str) {
    return "";
  }
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

// --- Navigation ---

document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.view).classList.add("active");
  });
});

// --- Init ---
loadData();
