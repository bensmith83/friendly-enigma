// Cybersecurity Job Tracker - Frontend Dashboard

(function () {
    'use strict';

    const REPORTS_URL = 'data/reports.json';
    const CACHE_KEY = 'cyber-job-tracker-cache';
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

    let currentReport = null;
    let allCompanyIntel = [];

    // --- Data Loading ---

    async function loadData() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                    return parsed.data;
                }
            } catch (e) { /* ignore bad cache */ }
        }

        const resp = await fetch(REPORTS_URL);
        if (!resp.ok) throw new Error('Failed to load reports');
        const data = await resp.json();

        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) { /* storage full, ignore */ }

        return data;
    }

    // --- Tab Navigation ---

    function initTabs() {
        document.querySelectorAll('.tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });
    }

    // --- Rendering Helpers ---

    function esc(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatCategory(cat) {
        return (cat || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function formatNumber(n) {
        return (n || 0).toLocaleString();
    }

    // --- Market Overview Tab ---

    function renderMarketOverview(report) {
        var market = report.market_overview;
        if (!market || market.error) {
            document.getElementById('market-loading').textContent = 'No market data available yet.';
            return;
        }

        document.getElementById('market-loading').classList.add('hidden');
        document.getElementById('market-content').classList.remove('hidden');

        // Stats
        var changePct = market.week_over_week_change_pct || 0;
        var changeClass = changePct > 0 ? 'positive' : changePct < 0 ? 'negative' : 'neutral';
        var changePrefix = changePct > 0 ? '+' : '';

        var momentum = market.hiring_momentum || 'unknown';
        var momentumClass = momentum === 'accelerating' ? 'positive' : momentum === 'decelerating' ? 'negative' : 'neutral';

        document.getElementById('market-stats').innerHTML =
            '<div class="stat-card"><div class="stat-value">' + formatNumber(market.total_companies_active) + '</div><div class="stat-label">Active Companies</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + formatNumber(market.total_positions) + '</div><div class="stat-label">Open Positions</div></div>' +
            '<div class="stat-card"><div class="stat-value ' + changeClass + '">' + changePrefix + changePct + '%</div><div class="stat-label">Week over Week</div></div>' +
            '<div class="stat-card"><div class="stat-value ' + momentumClass + '">' + esc(momentum) + '</div><div class="stat-label">Hiring Momentum</div></div>';

        // Summary
        document.getElementById('market-summary').innerHTML = '<p>' + esc(market.summary) + '</p>';

        // Technologies
        var techHtml = '';
        (market.top_technologies || []).forEach(function (tech) {
            var demandClass = 'demand-' + (tech.demand_signal || 'medium').toLowerCase();
            techHtml += '<div class="tech-item"><div><div class="tech-name">' + esc(tech.name) + '</div><div class="tech-context">' + esc(tech.context) + '</div></div><span class="demand-badge ' + demandClass + '">' + esc(tech.demand_signal) + '</span></div>';
        });
        document.getElementById('tech-list').innerHTML = techHtml || '<p>No technology data available.</p>';

        // Trends
        var trendsHtml = '';
        (market.emerging_trends || []).forEach(function (trend) {
            var sigClass = 'sig-' + (trend.significance || 'medium').toLowerCase();
            trendsHtml += '<div class="trend-item"><div class="trend-title">' + esc(trend.trend) + '<span class="significance-badge ' + sigClass + '">' + esc(trend.significance) + '</span></div><div class="trend-evidence">' + esc(trend.evidence) + '</div></div>';
        });
        document.getElementById('trends-list').innerHTML = trendsHtml || '<p>No trend data available.</p>';

        // Sectors
        var sectorsHtml = '';
        (market.sector_breakdown || []).forEach(function (sector) {
            var mClass = 'momentum-' + (sector.momentum || 'flat');
            sectorsHtml += '<div class="sector-item"><span class="sector-name">' + esc(sector.sector) + '</span><span class="sector-stat">' + (sector.companies_hiring || 0) + ' companies</span><span class="sector-stat">' + (sector.total_jobs || 0) + ' jobs</span><span class="sector-stat ' + mClass + '">' + esc(sector.momentum || 'flat') + '</span></div>';
        });
        document.getElementById('sectors-list').innerHTML = sectorsHtml || '<p>No sector data available.</p>';

        // Notable
        var notableHtml = '';
        (market.notable_movements || []).forEach(function (item) {
            notableHtml += '<div class="notable-item">' + esc(item) + '</div>';
        });
        document.getElementById('notable-list').innerHTML = notableHtml || '<p>No notable movements this week.</p>';
    }

    // --- Company Intel Tab ---

    function renderCompanyIntel(report) {
        allCompanyIntel = report.company_intel || [];
        if (!allCompanyIntel.length) {
            document.getElementById('companies-loading').textContent = 'No company data available yet.';
            return;
        }

        document.getElementById('companies-loading').classList.add('hidden');

        // Populate category filter
        var categories = {};
        allCompanyIntel.forEach(function (c) {
            var hp = c.hiring_profile || {};
            var cat = c.category || 'unknown';
            if (!categories[cat]) categories[cat] = true;
        });
        var filterHtml = '<option value="all">All Categories</option>';
        Object.keys(categories).sort().forEach(function (cat) {
            filterHtml += '<option value="' + esc(cat) + '">' + esc(formatCategory(cat)) + '</option>';
        });
        document.getElementById('company-filter').innerHTML = filterHtml;

        renderFilteredCompanies();

        // Event listeners
        document.getElementById('company-search').addEventListener('input', renderFilteredCompanies);
        document.getElementById('company-filter').addEventListener('change', renderFilteredCompanies);
        document.getElementById('health-filter').addEventListener('change', renderFilteredCompanies);
        document.getElementById('sort-by').addEventListener('change', renderFilteredCompanies);
    }

    function renderFilteredCompanies() {
        var search = (document.getElementById('company-search').value || '').toLowerCase();
        var categoryFilter = document.getElementById('company-filter').value;
        var healthFilter = document.getElementById('health-filter').value;
        var sortBy = document.getElementById('sort-by').value;

        var filtered = allCompanyIntel.filter(function (c) {
            if (search && c.company.toLowerCase().indexOf(search) === -1) return false;
            if (categoryFilter !== 'all') {
                var cat = c.category || '';
                if (cat !== categoryFilter) return false;
            }
            if (healthFilter !== 'all') {
                var signal = (c.financial_health || {}).signal || 'unknown';
                if (signal !== healthFilter) return false;
            }
            return true;
        });

        filtered.sort(function (a, b) {
            var aJobs = (a.hiring_profile || {}).total_jobs || 0;
            var bJobs = (b.hiring_profile || {}).total_jobs || 0;
            var aChange = (a.hiring_profile || {}).week_change || 0;
            var bChange = (b.hiring_profile || {}).week_change || 0;

            switch (sortBy) {
                case 'jobs-desc': return bJobs - aJobs;
                case 'jobs-asc': return aJobs - bJobs;
                case 'change-desc': return bChange - aChange;
                case 'change-asc': return aChange - bChange;
                case 'alpha': return a.company.localeCompare(b.company);
                default: return bJobs - aJobs;
            }
        });

        var html = '';
        filtered.forEach(function (c) {
            html += renderCompanyCard(c);
        });

        if (!html) {
            html = '<div class="no-data-message"><p>No companies match your filters.</p></div>';
        }

        document.getElementById('companies-list').innerHTML = html;
    }

    function renderCompanyCard(company) {
        var hp = company.hiring_profile || {};
        var fh = company.financial_health || {};
        var si = company.strategy_insights || {};
        var jobs = hp.total_jobs || 0;
        var change = hp.week_change || 0;

        var changeText = change > 0 ? '+' + change : change === 0 ? 'No change' : '' + change;
        var changeClass = change > 0 ? 'change-positive' : change < 0 ? 'change-negative' : 'change-neutral';

        var healthSignal = fh.signal || 'unknown';
        var healthClass = 'health-' + healthSignal;

        var techTags = '';
        (si.technology_focus || []).forEach(function (t) {
            techTags += '<span class="tech-tag">' + esc(t) + '</span>';
        });

        var notableRoles = '';
        (hp.notable_roles || []).slice(0, 5).forEach(function (r) {
            notableRoles += '<li>' + esc(r) + '</li>';
        });

        return '<div class="company-card">' +
            '<div class="company-header">' +
                '<div><div class="company-name">' + esc(company.company) + '</div>' +
                '<div class="company-category">' + esc(formatCategory(company.category || '')) + '</div></div>' +
                '<div class="company-jobs"><div class="job-count">' + jobs + '</div>' +
                '<div class="job-change ' + changeClass + '">' + changeText + ' from last week</div></div>' +
            '</div>' +
            '<span class="health-badge ' + healthClass + '">' + esc(healthSignal) + '</span>' +
            (si.product_direction ? '<div class="company-section"><h4>Product Direction</h4><p>' + esc(si.product_direction) + '</p></div>' : '') +
            (techTags ? '<div class="company-section"><h4>Technology Focus</h4><div class="tech-tags">' + techTags + '</div></div>' : '') +
            (si.expansion_areas ? '<div class="company-section"><h4>Expansion</h4><p>' + esc(si.expansion_areas) + '</p></div>' : '') +
            (fh.reasoning ? '<div class="company-section"><h4>Financial Health</h4><p>' + esc(fh.reasoning) + '</p></div>' : '') +
            (company.competitive_positioning ? '<div class="company-section"><h4>Competitive Position</h4><p>' + esc(company.competitive_positioning) + '</p></div>' : '') +
            (notableRoles ? '<div class="company-section"><h4>Notable Roles</h4><ul class="notable-roles">' + notableRoles + '</ul></div>' : '') +
        '</div>';
    }

    // --- Salary Report Tab ---

    function renderSalaryReport(report) {
        var salary = report.salary_report;
        if (!salary) {
            document.getElementById('salary-loading').textContent = 'No salary data available yet.';
            return;
        }

        document.getElementById('salary-loading').classList.add('hidden');
        document.getElementById('salary-content').classList.remove('hidden');

        if (!salary.has_data) {
            document.getElementById('salary-overview').innerHTML = '<div class="no-data-message"><p>' + esc(salary.note || 'No salary data available this week.') + '</p><p>Most cybersecurity companies do not include salary ranges in their job postings. Data will appear as it becomes available.</p></div>';
            document.getElementById('salary-by-role').classList.add('hidden');
            document.getElementById('salary-by-level').classList.add('hidden');
            document.getElementById('salary-top').classList.add('hidden');
            document.getElementById('salary-insights').classList.add('hidden');
            return;
        }

        // Overview
        document.getElementById('salary-overview').innerHTML =
            '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-value">' + (salary.total_data_points || 0) + '</div><div class="stat-label">Salary Data Points</div></div>' +
            '</div>';

        // By role
        var roleHtml = '<table class="salary-table"><thead><tr><th>Role Type</th><th>Postings</th><th>Range</th><th>Median Est.</th></tr></thead><tbody>';
        (salary.by_role_type || []).forEach(function (role) {
            roleHtml += '<tr><td>' + esc(role.role_type) + '</td><td>' + (role.count || 0) + '</td><td class="salary-range">$' + formatNumber(role.salary_range_low) + ' - $' + formatNumber(role.salary_range_high) + '</td><td class="salary-range">$' + formatNumber(role.median_estimate) + '</td></tr>';
        });
        roleHtml += '</tbody></table>';
        document.getElementById('role-salary-list').innerHTML = roleHtml;

        // By level
        var levelHtml = '<table class="salary-table"><thead><tr><th>Level</th><th>Avg Range</th><th>Postings</th></tr></thead><tbody>';
        (salary.by_level || []).forEach(function (level) {
            levelHtml += '<tr><td>' + esc(level.level) + '</td><td class="salary-range">' + esc(level.avg_range) + '</td><td>' + (level.count || 0) + '</td></tr>';
        });
        levelHtml += '</tbody></table>';
        document.getElementById('level-salary-list').innerHTML = levelHtml;

        // Top paying
        var topHtml = '';
        (salary.highest_paying_roles || []).forEach(function (role) {
            topHtml += '<div class="tech-item"><div><div class="tech-name">' + esc(role.title) + '</div><div class="tech-context">' + esc(role.company) + '</div></div><span class="salary-range">' + esc(role.range) + '</span></div>';
        });
        document.getElementById('top-salary-list').innerHTML = topHtml || '<p>No data available.</p>';

        // Insights
        var insightsHtml = '';
        (salary.insights || []).forEach(function (insight) {
            insightsHtml += '<div class="notable-item">' + esc(insight) + '</div>';
        });
        document.getElementById('insights-list').innerHTML = insightsHtml || '<p>No insights available.</p>';
    }

    // --- Report History ---

    function renderReportSelector(reports) {
        if (reports.length <= 1) return;

        var selectorHtml = '<div class="report-selector"><label>View report from:</label><select id="report-date-select">';
        reports.forEach(function (r, i) {
            selectorHtml += '<option value="' + i + '">' + esc(r.date) + (i === 0 ? ' (Latest)' : '') + '</option>';
        });
        selectorHtml += '</select></div>';

        // Insert before tabs
        var tabs = document.querySelector('.tabs');
        var div = document.createElement('div');
        div.innerHTML = selectorHtml;
        tabs.parentNode.insertBefore(div.firstChild, tabs);

        document.getElementById('report-date-select').addEventListener('change', function () {
            var idx = parseInt(this.value, 10);
            currentReport = reports[idx];
            renderAll(currentReport);
        });
    }

    // --- Init ---

    function renderAll(report) {
        document.getElementById('last-updated').textContent = 'Report date: ' + (report.date || 'N/A') + ' | ' + (report.companies_analyzed || 0) + ' companies analyzed';
        renderMarketOverview(report);
        renderCompanyIntel(report);
        renderSalaryReport(report);
    }

    async function init() {
        initTabs();

        try {
            var data = await loadData();
            var reports = data.reports || [];

            if (!reports.length) {
                document.getElementById('market-loading').textContent = 'No reports generated yet. Data will appear after the first weekly run.';
                document.getElementById('companies-loading').textContent = 'No reports generated yet.';
                document.getElementById('salary-loading').textContent = 'No reports generated yet.';
                return;
            }

            currentReport = reports[0];
            renderReportSelector(reports);
            renderAll(currentReport);
        } catch (e) {
            document.getElementById('market-loading').textContent = 'Failed to load data. Please try again later.';
            document.getElementById('companies-loading').textContent = 'Failed to load data.';
            document.getElementById('salary-loading').textContent = 'Failed to load data.';
            console.error('Failed to load report data:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
