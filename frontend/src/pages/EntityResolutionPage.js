import { api } from '../api.js';

export function renderEntityResolutionPage(container, onViewEntity) {
  let currentPage = 1;
  let pageSize = 20;
  let currentCountry = 'ALL';
  let currentStatus = 'ALL';
  let currentConf = '0';
  let currentSearch = '';

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Entity Resolution</h1>
          <p class="page-subtitle">Search and inspect how records are resolved across sources.</p>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="toolbar card" style="padding: 16px; margin-bottom: 24px;">
        <div class="search-bar-large">
          <input 
            type="text" 
            id="input-search" 
            class="input-text" 
            placeholder="Search business name or entity ID..." 
          />
        </div>

        <div class="filter-group">
          <select id="select-country" class="select-input" style="width: 140px;">
            <option value="ALL">All Countries</option>
            <option value="US">US</option>
            <option value="India">India</option>
          </select>

          <select id="select-status" class="select-input" style="width: 160px;">
            <option value="ALL">All Statuses</option>
            <option value="Matched">Resolved / Matched</option>
            <option value="High Confidence">High Confidence (≥82%)</option>
            <option value="Review Required">Review Required</option>
            <option value="Unmatched">Unmatched</option>
          </select>

          <select id="select-conf" class="select-input" style="width: 150px;">
            <option value="0">Min Confidence: Any</option>
            <option value="0.70">≥ 70% Confidence</option>
            <option value="0.80">≥ 80% Confidence</option>
            <option value="0.90">≥ 90% Confidence</option>
          </select>

          <select id="select-pagesize" class="select-input" style="width: 100px;">
            <option value="20" selected>20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>

          <button id="btn-reset-filters" class="btn btn-secondary btn-sm" title="Reset Filters">
            Reset
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="section-block" style="padding: 0; overflow: hidden;">
        <div id="table-loading" class="empty-state" style="padding: 40px;">
          <div class="empty-state-title">Loading resolved entities...</div>
          <div class="empty-state-desc">Fetching server-side paginated records</div>
        </div>

        <div id="table-wrapper" style="display: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Entity ID</th>
                <th>Business Name</th>
                <th>Country</th>
                <th>Sources</th>
                <th>Confidence</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="entities-tbody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div id="pagination-wrapper" class="pagination-bar" style="padding: 16px 20px; display: none;">
          <div id="pagination-info">Showing 1–20 of 2,000 records</div>
          <div class="pagination-controls">
            <button id="btn-page-prev" class="page-btn">Previous</button>
            <span id="page-current-label" style="font-weight: 600; padding: 0 6px;">Page 1</span>
            <button id="btn-page-next" class="page-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#input-search');
  const countrySelect = container.querySelector('#select-country');
  const statusSelect = container.querySelector('#select-status');
  const confSelect = container.querySelector('#select-conf');
  const pageSizeSelect = container.querySelector('#select-pagesize');
  const resetBtn = container.querySelector('#btn-reset-filters');
  const prevBtn = container.querySelector('#btn-page-prev');
  const nextBtn = container.querySelector('#btn-page-next');

  let searchTimeout = null;

  async function loadData() {
    container.querySelector('#table-loading').style.display = 'block';
    container.querySelector('#table-wrapper').style.display = 'none';
    container.querySelector('#pagination-wrapper').style.display = 'none';

    try {
      const res = await api.getEntities({
        page: currentPage,
        page_size: pageSize,
        country: currentCountry,
        match_status: currentStatus,
        confidence_min: currentConf,
        search: currentSearch,
      });

      const { items, total_records, total_pages, page } = res.data;
      currentPage = page;

      const tbody = container.querySelector('#entities-tbody');
      if (!items || items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state" style="padding: 40px;">
              <div class="empty-state-title">No entities found</div>
              <div class="empty-state-desc">Try clearing filters or changing search keywords.</div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = items.map(item => {
          const confPct = Math.round(item.confidence * 100);
          let badgeClass = 'badge-unmatched';
          if (item.status === 'High Confidence') badgeClass = 'badge-high';
          else if (item.status === 'Resolved') badgeClass = 'badge-resolved';
          else if (item.status === 'Review Required') badgeClass = 'badge-review';

          const sources = (item.matched_sources || []).map(s => `<span class="source-tag">${s}</span>`).join(' · ');

          return `
            <tr>
              <td><span class="entity-id-badge">${item.entity_id}</span></td>
              <td style="font-weight: 600;">
                <div>${item.business_name}</div>
                ${item.business_address ? `<div style="font-size: 11px; color: var(--text-muted); font-weight: normal; margin-top: 2px;">${item.business_address}</div>` : ''}
              </td>
              <td>${item.country}</td>
              <td>${sources || '<span style="color:var(--text-muted); font-size:12px;">Unmatched</span>'}</td>
              <td><strong>${item.match_count > 0 ? `${confPct}%` : '—'}</strong></td>
              <td><span class="badge ${badgeClass}">${item.status}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm btn-inspect" data-id="${item.entity_id}">
                  View
                </button>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-inspect').forEach(btn => {
          btn.addEventListener('click', () => {
            onViewEntity(btn.dataset.id);
          });
        });
      }

      // Update pagination
      const startIdx = (currentPage - 1) * pageSize + 1;
      const endIdx = Math.min(total_records, currentPage * pageSize);
      container.querySelector('#pagination-info').textContent = 
        total_records > 0 ? `Showing ${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${total_records.toLocaleString()} records` : '0 records';
      
      container.querySelector('#page-current-label').textContent = `Page ${currentPage} of ${Math.max(1, total_pages)}`;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= total_pages;

      container.querySelector('#table-loading').style.display = 'none';
      container.querySelector('#table-wrapper').style.display = 'block';
      container.querySelector('#pagination-wrapper').style.display = 'flex';

    } catch (err) {
      container.querySelector('#table-loading').innerHTML = `
        <div class="empty-state-title" style="color: #ef4444;">Failed to load records</div>
        <div class="empty-state-desc">${err.message}</div>
      `;
    }
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      loadData();
    }, 300);
  });

  countrySelect.addEventListener('change', (e) => {
    currentCountry = e.target.value;
    currentPage = 1;
    loadData();
  });

  statusSelect.addEventListener('change', (e) => {
    currentStatus = e.target.value;
    currentPage = 1;
    loadData();
  });

  confSelect.addEventListener('change', (e) => {
    currentConf = e.target.value;
    currentPage = 1;
    loadData();
  });

  pageSizeSelect.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10);
    currentPage = 1;
    loadData();
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    countrySelect.value = 'ALL';
    currentCountry = 'ALL';
    statusSelect.value = 'ALL';
    currentStatus = 'ALL';
    confSelect.value = '0';
    currentConf = '0';
    pageSizeSelect.value = '20';
    pageSize = 20;
    currentPage = 1;
    loadData();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadData();
    }
  });

  nextBtn.addEventListener('click', () => {
    currentPage++;
    loadData();
  });

  // Initial load
  loadData();
}
