import { api } from '../api.js';

export async function renderDashboardPage(container, onNavigate, onViewEntity) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Entity Resolution Dashboard</h1>
          <p class="page-subtitle">Overview of business records and matching activity across sources.</p>
        </div>
        <div>
          <button id="btn-explore-match" class="btn btn-primary">
            <span>✨</span> Explore a Match
          </button>
        </div>
      </div>

      <div id="dashboard-loading" class="empty-state">
        <div class="empty-state-title">Loading dashboard metrics...</div>
        <div class="empty-state-desc">Fetching real records from SQLite database</div>
      </div>

      <div id="dashboard-content" style="display: none;">
        <!-- 4 Compact Metric Cards -->
        <div class="stats-grid-4">
          <div class="card">
            <div class="stat-label">Source 1 Entities</div>
            <div class="stat-value" id="stat-s1">-</div>
            <div class="stat-sub">Reference entities</div>
          </div>
          <div class="card">
            <div class="stat-label">Source 2 Records</div>
            <div class="stat-value" id="stat-s2">-</div>
            <div class="stat-sub">Noisy business records</div>
          </div>
          <div class="card">
            <div class="stat-label">Source 3 Records</div>
            <div class="stat-value" id="stat-s3">-</div>
            <div class="stat-sub">Noisy business records</div>
          </div>
          <div class="card">
            <div class="stat-label">Resolved Matches</div>
            <div class="stat-value" id="stat-matches" style="color: var(--accent);">-</div>
            <div class="stat-sub">Matched reference entities</div>
          </div>
        </div>

        <!-- Resolution Overview & Source Distribution Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px;">
          <div class="section-block" style="margin-bottom: 0;">
            <h2 class="section-title">Resolution Overview</h2>
            <div class="mini-bar-chart" id="chart-resolution">
              <!-- Rendered via JS -->
            </div>
          </div>

          <div class="section-block" style="margin-bottom: 0;">
            <h2 class="section-title">Source Distribution</h2>
            <div class="mini-bar-chart" id="chart-sources">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>

        <!-- Recent Resolutions Table -->
        <div class="section-block">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 class="section-title" style="margin-bottom: 0;">Recent Resolutions</h2>
            <button id="btn-view-all" class="btn btn-secondary btn-sm">
              View All in Entity Resolution →
            </button>
          </div>
          
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Entity ID</th>
                  <th>Business</th>
                  <th>Country</th>
                  <th>Matched Sources</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="recent-resolutions-tbody">
                <!-- Rendered via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind actions
  const exploreBtn = container.querySelector('#btn-explore-match');
  exploreBtn.addEventListener('click', async () => {
    try {
      exploreBtn.disabled = true;
      exploreBtn.textContent = 'Loading entity...';
      const res = await api.getDemoEntity();
      if (res.data && res.data.entity_id) {
        onViewEntity(res.data.entity_id);
      }
    } catch (err) {
      alert('Could not load demo match: ' + err.message);
    } finally {
      exploreBtn.disabled = false;
      exploreBtn.innerHTML = '<span>✨</span> Explore a Match';
    }
  });

  const viewAllBtn = container.querySelector('#btn-view-all');
  viewAllBtn.addEventListener('click', () => {
    onNavigate('entities');
  });

  // Fetch real data
  try {
    const res = await api.getDashboard();
    const data = res.data;

    container.querySelector('#stat-s1').textContent = Number(data.source1_entities).toLocaleString();
    container.querySelector('#stat-s2').textContent = Number(data.source2_records).toLocaleString();
    container.querySelector('#stat-s3').textContent = Number(data.source3_records).toLocaleString();
    container.querySelector('#stat-matches').textContent = Number(data.resolved_matches).toLocaleString();

    // Render Resolution Overview Bar Chart
    const breakdown = data.resolution_breakdown || {};
    const totalS1 = data.source1_entities || 1;
    const resBars = [
      { label: 'Matched', count: breakdown.matched || 0, color: '#10b981' },
      { label: 'Unmatched', count: breakdown.unmatched || 0, color: '#94a3b8' },
      { label: 'High-confidence', count: breakdown.high_confidence || 0, color: '#2563eb' },
      { label: 'Review required', count: breakdown.review_required || 0, color: '#f59e0b' },
    ];

    const chartResEl = container.querySelector('#chart-resolution');
    chartResEl.innerHTML = resBars.map(b => {
      const pct = Math.min(100, Math.round((b.count / totalS1) * 100));
      return `
        <div class="mini-bar-row">
          <div class="mini-bar-label">${b.label}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width: ${pct}%; background-color: ${b.color};"></div>
          </div>
          <div class="mini-bar-val">${Number(b.count).toLocaleString()} (${pct}%)</div>
        </div>
      `;
    }).join('');

    // Render Source Distribution
    const srcDist = data.source_distribution || {};
    const totalRecords = (srcDist['Source 1'] || 0) + (srcDist['Source 2'] || 0) + (srcDist['Source 3'] || 0) || 1;
    const srcBars = [
      { label: 'Source 1 (Reference)', count: srcDist['Source 1'] || 0, color: '#2563eb' },
      { label: 'Source 2 (Noisy)', count: srcDist['Source 2'] || 0, color: '#6366f1' },
      { label: 'Source 3 (Noisy)', count: srcDist['Source 3'] || 0, color: '#8b5cf6' },
    ];

    const chartSrcEl = container.querySelector('#chart-sources');
    chartSrcEl.innerHTML = srcBars.map(b => {
      const pct = Math.min(100, Math.round((b.count / totalRecords) * 100));
      return `
        <div class="mini-bar-row">
          <div class="mini-bar-label">${b.label}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width: ${pct}%; background-color: ${b.color};"></div>
          </div>
          <div class="mini-bar-val">${Number(b.count).toLocaleString()} (${pct}%)</div>
        </div>
      `;
    }).join('');

    // Render Recent Resolutions Table
    const tbody = container.querySelector('#recent-resolutions-tbody');
    const recent = data.recent_resolutions || [];
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No resolutions found yet.</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(r => {
        const confPct = Math.round(r.confidence * 100);
        const statusBadgeClass = r.status === 'High Confidence' ? 'badge-high' : 'badge-resolved';
        const sourceTags = (r.matched_sources || []).map(s => `<span class="source-tag">${s}</span>`).join(' · ');

        return `
          <tr>
            <td><span class="entity-id-badge">${r.entity_id}</span></td>
            <td style="font-weight: 600;">${r.business_name}</td>
            <td>${r.country}</td>
            <td>${sourceTags || '<span style="color:var(--text-muted);">None</span>'}</td>
            <td><strong>${confPct}%</strong></td>
            <td><span class="badge ${statusBadgeClass}">${r.status}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm btn-view-item" data-id="${r.entity_id}">
                View
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-view-item').forEach(btn => {
        btn.addEventListener('click', () => {
          onViewEntity(btn.dataset.id);
        });
      });
    }

    container.querySelector('#dashboard-loading').style.display = 'none';
    container.querySelector('#dashboard-content').style.display = 'block';

  } catch (err) {
    container.querySelector('#dashboard-loading').innerHTML = `
      <div class="empty-state-title" style="color: #ef4444;">Failed to load dashboard</div>
      <div class="empty-state-desc">${err.message}</div>
    `;
  }
}
