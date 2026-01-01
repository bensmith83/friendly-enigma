/**
 * ALS Research Aggregator - Frontend JavaScript
 */

// State
let digests = [];
let currentDigestIndex = 0;
let currentCategory = 'all';

// DOM elements
const digestSelect = document.getElementById('digest-select');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const contentEl = document.getElementById('digest-content');
const summaryTextEl = document.getElementById('summary-text');
const digestDateEl = document.getElementById('digest-date');
const articleCountEl = document.getElementById('article-count');
const highlightsSection = document.getElementById('highlights-section');
const highlightsList = document.getElementById('highlights-list');
const categoryTabs = document.getElementById('category-tabs');
const articlesContainer = document.getElementById('articles-container');
const referencesList = document.getElementById('references-list');

/**
 * Initialize the application
 */
async function init() {
    try {
        await loadDigests();
        setupEventListeners();
        renderCurrentDigest();
    } catch (error) {
        console.error('Failed to initialize:', error);
        showError();
    }
}

/**
 * Load digests from JSON file
 */
async function loadDigests() {
    const response = await fetch('data/digests.json');
    if (!response.ok) {
        throw new Error('Failed to load digests');
    }
    digests = await response.json();

    if (!digests || digests.length === 0) {
        throw new Error('No digests available');
    }

    // Populate digest selector
    digestSelect.innerHTML = digests.map((digest, index) => {
        const date = digest.week_of || digest.date;
        const num = digest.digest_number || (digests.length - index);
        return `<option value="${index}">Digest #${num} - ${date}</option>`;
    }).join('');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Digest selector
    digestSelect.addEventListener('change', (e) => {
        currentDigestIndex = parseInt(e.target.value, 10);
        currentCategory = 'all';
        renderCurrentDigest();
    });

    // Category tabs
    categoryTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-tab')) {
            currentCategory = e.target.dataset.category;
            updateCategoryTabs();
            renderArticles();
        }
    });
}

/**
 * Render the current digest
 */
function renderCurrentDigest() {
    const digest = digests[currentDigestIndex];
    if (!digest) {
        showError();
        return;
    }

    hideLoading();

    // Weekly summary
    const summaryParagraphs = (digest.weekly_summary || 'No summary available.')
        .split('\n\n')
        .filter(p => p.trim())
        .map(p => `<p>${escapeHtml(p)}</p>`)
        .join('');
    summaryTextEl.innerHTML = summaryParagraphs;

    // Metadata
    digestDateEl.textContent = `Week of ${digest.week_of || digest.date}`;
    articleCountEl.textContent = digest.article_count || 0;

    // Highlights
    renderHighlights(digest.highlights || []);

    // Articles
    renderArticles();

    // References
    renderReferences(digest.references || []);

    contentEl.style.display = 'block';
}

/**
 * Render highlights section
 */
function renderHighlights(highlights) {
    if (!highlights || highlights.length === 0) {
        highlightsSection.style.display = 'none';
        return;
    }

    highlightsSection.style.display = 'block';
    highlightsList.innerHTML = highlights.map(h => {
        const article = h.article || {};
        return `
            <div class="highlight-item">
                <h3><a href="${escapeHtml(article.url || '#')}" target="_blank" rel="noopener">${escapeHtml(article.title || 'Untitled')}</a></h3>
                <p class="why-important">${escapeHtml(h.why_important || '')}</p>
            </div>
        `;
    }).join('');
}

/**
 * Update category tab active states
 */
function updateCategoryTabs() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === currentCategory);
    });
}

/**
 * Render articles based on current category filter
 */
function renderArticles() {
    const digest = digests[currentDigestIndex];
    if (!digest || !digest.categories) {
        articlesContainer.innerHTML = '<div class="empty-category">No articles available.</div>';
        return;
    }

    let articles = [];

    if (currentCategory === 'all') {
        // Combine all categories
        Object.entries(digest.categories).forEach(([cat, catArticles]) => {
            catArticles.forEach(article => {
                articles.push({ ...article, category: cat });
            });
        });
        // Sort by importance
        articles.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    } else {
        articles = (digest.categories[currentCategory] || []).map(a => ({
            ...a,
            category: currentCategory
        }));
    }

    if (articles.length === 0) {
        const catName = currentCategory === 'all' ? 'any category' : currentCategory;
        articlesContainer.innerHTML = `<div class="empty-category">No articles in ${catName} this week.</div>`;
        return;
    }

    articlesContainer.innerHTML = articles.map(article => renderArticleCard(article)).join('');
}

/**
 * Render a single article card
 */
function renderArticleCard(article) {
    const isLocal = article.category === 'local' || article.is_local_nj;
    const categoryLabel = article.category || 'research';

    // Importance stars
    const importance = article.importance || 3;
    const stars = '★'.repeat(Math.min(importance, 5));

    // Related previous articles
    let relatedHtml = '';
    if (article.related_previous && article.related_previous.length > 0) {
        const relatedLinks = article.related_previous.map(r =>
            `<a href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener">${escapeHtml(r.title || 'Related').substring(0, 50)}...</a> (${r.digest_date || 'previous'})`
        ).join(', ');

        relatedHtml = `
            <div class="related-previous">
                <div class="related-previous-label">Updates to previous coverage:</div>
                <div class="related-previous-items">${relatedLinks}</div>
            </div>
        `;
    }

    return `
        <article class="article-card ${isLocal ? 'local' : ''}">
            <span class="article-category">${escapeHtml(categoryLabel)}</span>
            <span class="importance-badge"><span class="star">${stars}</span></span>
            <h3><a href="${escapeHtml(article.url || '#')}" target="_blank" rel="noopener">${escapeHtml(article.title || 'Untitled')}</a></h3>
            <div class="article-meta">
                ${escapeHtml(article.source_name || 'Unknown source')}
                ${article.published_at ? ` • ${formatDate(article.published_at)}` : ''}
                ${article.author ? ` • ${escapeHtml(article.author)}` : ''}
            </div>
            <div class="article-summary">${escapeHtml(article.summary || article.description || 'No summary available.')}</div>
            <div class="article-source">
                Source: <a href="${escapeHtml(article.url || '#')}" target="_blank" rel="noopener">${escapeHtml(article.url || 'Link')}</a>
            </div>
            ${relatedHtml}
        </article>
    `;
}

/**
 * Render references section
 */
function renderReferences(references) {
    if (!references || references.length === 0) {
        referencesList.innerHTML = '<li>No references available.</li>';
        return;
    }

    referencesList.innerHTML = references.map((ref, index) => {
        return `
            <li>
                <a href="${escapeHtml(ref.url || '#')}" target="_blank" rel="noopener">${escapeHtml(ref.title || 'Untitled')}</a>
                <span class="ref-source"> - ${escapeHtml(ref.source || 'Unknown source')}${ref.date ? `, ${formatDate(ref.date)}` : ''}</span>
            </li>
        `;
    }).join('');
}

/**
 * Show loading state
 */
function showLoading() {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
    loadingEl.style.display = 'none';
}

/**
 * Show error state
 */
function showError() {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    contentEl.style.display = 'none';
}

/**
 * Format a date string
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
