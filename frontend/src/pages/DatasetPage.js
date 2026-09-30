import { api } from '../api.js';

export async function renderDatasetPage(container) {
  let activeTab = 'S1';
  let currentPage = 1;
  const pageSize = 20;

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dataset</h1>
          <p class="page-subtitle">Multi-source business entity resolution training dataset files and schema.</p>
        </div>
      </div>

      <!-- 4 Compact Dataset Counts Cards -->
      <div class="stats-grid-4">
        <div class="card">
          <div class="stat-label">Source 1</div>
          <div class="stat-value" id="file-count-s1">-</div>
          <div class="stat-sub">Reference entities (train_source1.tsv)</div>
        </div>

        <div class="card">
          <div class="stat-label">Source 2</div>
          <div class="stat-value" id="file-count-s2">-</div>
          <div class="stat-sub">Noisy records (train_source2.tsv)</div>
        </div>

        <div class="card">
          <div class="stat-label">Source 3</div>
          <div class="stat-value" id="file-count-s3">-</div>
          <div class="stat-sub">Noisy records (train_source3.tsv)</div>
        </div>

        <div class="card">
          <div class="stat-label">Ground Truth</div>
          <div class="stat-value" id="file-count-gt" style="color: var(--accent);">-</div>
          <div class="stat-sub">Validated pairs (train_ground_truth.tsv)</div>
        </div>
      </div>

      <!-- Data Fields Schema & Notice -->
      <div class="section-block">
        <h2 class="section-title">Data Fields</h2>
        <div class="table-wrapper" style="margin-bottom: 16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Data Type</th>
                <th>Role & Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>entity_id</code></td>
                <td>String</td>
                <td>Unique record key with source prefix (e.g., S1-925783039, S2-166376419, S3-202863386)</td>
              </tr>
              <tr>
                <td><code>business_name</code></td>
                <td>String (Unicode)</td>
                <td>Reported business or trade name; contains typos, acronyms, or non-English scripts</td>
              </tr>
              <tr>
                <td><code>business_address</code></td>
                <td>String (Unicode)</td>
                <td>Street, suite, city, state; may be omitted or empty in noisy sources</td>
              </tr>
              <tr>
                <td><code>country</code></td>
                <td>String</td>
                <td>ISO/standard country name (used as strict primary blocking key)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background: var(--bg-secondary); border-left: 3px solid var(--accent); padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px; color: var(--text-secondary);">
          ℹ️ <strong>System Architecture Notice:</strong> Large datasets are processed server-side. Only relevant records are displayed in the interface. Full pipeline scanning and indexing leverage SQLite WAL and streaming memory buffers.
        </div>
      </div>

      <!-- Preview Tabs Section -->
      <div class="section-block">
        <h2 class="section-title">Dataset File Previews</h2>
        
        <div class="tabs-nav">
          <button class="tab-btn active" data-source="S1">Source 1 (Reference)</button>
          <button class="tab-btn" data-source="S2">Source 2 (Noisy)</button>
          <button class="tab-btn" data-source="S3">Source 3 (Noisy)</button>
        </div>

        <div id="preview-loading" class="empty-state" style="padding: 24px; display: none;">
          <div class="empty-state-title">Loading preview records...</div>
        </div>

        <div id="preview-wrapper">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Entity ID</th>
                  <th>Source</th>
                  <th>Business Name</th>
                  <th>Business Address</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody id="preview-tbody">
                <!-- JS populated -->
              </tbody>
            </table>
          </div>

          <!-- Preview Pagination -->
          <div class="pagination-bar">
            <div id="preview-pagination-info">Showing records</div>
            <div class="pagination-controls">
              <button id="btn-preview-prev" class="page-btn">Previous</button>
              <span id="preview-page-label" style="font-weight: 600; padding: 0 6px;">Page 1</span>
              <button id="btn-preview-next" class="page-btn">Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Fetch file counts
  try {
    const statsRes = await api.getDatasetStats();
    const counts = statsRes.data.file_counts || {};
    container.querySelector('#file-count-s1').textContent = Number(counts.source1_count || 2206821).toLocaleString();
    container.querySelector('#file-count-s2').textContent = Number(counts.source2_count || 5034616).toLocaleString();
    container.querySelector('#file-count-s3').textContent = Number(counts.source3_count || 5285603).toLocaleString();
    container.querySelector('#file-count-gt').textContent = Number(counts.ground_truth_count || 2206821).toLocaleString();
  } catch (err) {
    console.error('Failed to load dataset stats:', err);
  }

  // Load preview data
  async function loadPreview() {
    const loadingEl = container.querySelector('#preview-loading');
    const wrapperEl = container.querySelector('#preview-wrapper');
    loadingEl.style.display = 'block';
    wrapperEl.style.display = 'none';

    try {
      const res = await api.getDatasetPreview(activeTab, currentPage, pageSize);
      const { items, total_records, total_pages, page } = res.data;
      currentPage = page;

      const tbody = container.querySelector('#preview-tbody');
      tbody.innerHTML = (items || []).map(item => `
        <tr>
          <td><span class="entity-id-badge">${item.entity_id}</span></td>
          <td><span class="source-tag">${item.source}</span></td>
          <td style="font-weight: 600;">${item.business_name}</td>
          <td style="font-size: 12px; color: var(--text-secondary);">${item.business_address || '<span style="color:var(--text-muted);">None</span>'}</td>
          <td>${item.country}</td>
        </tr>
      `).join('');

      const startIdx = (currentPage - 1) * pageSize + 1;
      const endIdx = Math.min(total_records, currentPage * pageSize);
      container.querySelector('#preview-pagination-info').textContent =
        `Showing ${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${total_records.toLocaleString()} indexed records`;

      container.querySelector('#preview-page-label').textContent = `Page ${currentPage} of ${Math.max(1, total_pages)}`;
      container.querySelector('#btn-preview-prev').disabled = currentPage <= 1;
      container.querySelector('#btn-preview-next').disabled = currentPage >= total_pages;

      loadingEl.style.display = 'none';
      wrapperEl.style.display = 'block';
    } catch (err) {
      loadingEl.innerHTML = `<div style="color: #ef4444;">Failed to load preview: ${err.message}</div>`;
    }
  }

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.source;
      currentPage = 1;
      loadPreview();
    });
  });

  container.querySelector('#btn-preview-prev').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadPreview();
    }
  });

  container.querySelector('#btn-preview-next').addEventListener('click', () => {
    currentPage++;
    loadPreview();
  });

  // Initial load
  loadPreview();
}
