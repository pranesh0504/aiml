import { api } from '../api.js';

export async function renderAnalyticsPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Resolution Analytics</h1>
          <p class="page-subtitle">Matching performance metrics and validation evaluation against ground truth.</p>
        </div>
      </div>

      <div id="analytics-loading" class="empty-state">
        <div class="empty-state-title">Loading analytics...</div>
        <div class="empty-state-desc">Calculating matching and validation distributions</div>
      </div>

      <div id="analytics-content" style="display: none;">
        <!-- Top 4 Summary Cards -->
        <div class="stats-grid-4">
          <div class="card">
            <div class="stat-label">Match Rate</div>
            <div class="stat-value" id="stat-match-rate">-</div>
            <div class="stat-sub">S1 entities resolved</div>
          </div>
          <div class="card">
            <div class="stat-label">Unmatched Rate</div>
            <div class="stat-value" id="stat-unmatched-rate">-</div>
            <div class="stat-sub">True singleton entities</div>
          </div>
          <div class="card">
            <div class="stat-label">Average Confidence</div>
            <div class="stat-value" id="stat-avg-conf" style="color: var(--accent);">-</div>
            <div class="stat-sub">Resolved pair score</div>
          </div>
          <div class="card">
            <div class="stat-label">Total Candidate Pairs</div>
            <div class="stat-value" id="stat-cand-pairs">-</div>
            <div class="stat-sub">Pre-threshold evaluated</div>
          </div>
        </div>

        <!-- Ground Truth Validation Section -->
        <div class="section-block" style="border-left: 4px solid var(--accent);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h2 class="section-title" style="margin-bottom: 2px;">Ground Truth Validation Metrics</h2>
              <div style="font-size: 13px; color: var(--text-secondary);">
                Empirical evaluation evaluated strictly against <code>train_ground_truth.tsv</code>.
              </div>
            </div>
            <span class="badge badge-high">Precision-Heavy F0.5 Optimization</span>
          </div>

          <div class="stats-grid-4" style="margin-bottom: 0;">
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md);">
              <div class="stat-label">Precision</div>
              <div class="stat-value" id="val-precision" style="color: #059669;">-</div>
              <div class="stat-sub" id="val-tp-fp">TP: - | FP: -</div>
            </div>

            <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md);">
              <div class="stat-label">Recall</div>
              <div class="stat-value" id="val-recall">-</div>
              <div class="stat-sub" id="val-fn">FN: -</div>
            </div>

            <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md);">
              <div class="stat-label">F0.5 Score</div>
              <div class="stat-value" id="val-f05" style="color: var(--accent);">-</div>
              <div class="stat-sub">Precision weighted 2x</div>
            </div>

            <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md);">
              <div class="stat-label">Candidate Recall</div>
              <div class="stat-value" id="val-cand-recall">-</div>
              <div class="stat-sub">TF-IDF retrieval coverage</div>
            </div>
          </div>
        </div>

        <!-- 3 Visualizations Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
          <!-- Chart 1: Match Confidence Distribution -->
          <div class="section-block">
            <h2 class="section-title">1. Match Confidence Distribution</h2>
            <div class="mini-bar-chart" id="chart-conf-dist">
              <!-- JS rendered -->
            </div>
          </div>

          <!-- Chart 2: Records by Country -->
          <div class="section-block">
            <h2 class="section-title">2. Records by Country</h2>
            <div class="mini-bar-chart" id="chart-country-dist">
              <!-- JS rendered -->
            </div>
          </div>

          <!-- Chart 3: Source 2 vs Source 3 Matches -->
          <div class="section-block">
            <h2 class="section-title">3. Source 2 vs Source 3 Matches</h2>
            <div class="mini-bar-chart" id="chart-source-matches">
              <!-- JS rendered -->
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  try {
    const res = await api.getAnalytics();
    const data = res.data;

    container.querySelector('#stat-match-rate').textContent = `${data.match_rate}%`;
    container.querySelector('#stat-unmatched-rate').textContent = `${data.unmatched_rate}%`;
    container.querySelector('#stat-avg-conf').textContent = `${data.average_confidence}%`;
    container.querySelector('#stat-cand-pairs').textContent = Number(data.total_candidate_pairs).toLocaleString();

    // Validation Metrics
    const val = data.validation || {};
    const prec = data.precision || val.precision || 0;
    const rec = data.recall || val.recall || 0;
    const f05 = data.f0_5 || val.f0_5 || 0;
    const cRec = data.candidate_recall || val.candidate_recall || 0;

    container.querySelector('#val-precision').textContent = `${(prec * 100).toFixed(2)}%`;
    container.querySelector('#val-recall').textContent = `${(rec * 100).toFixed(2)}%`;
    container.querySelector('#val-f05').textContent = `${(f05 * 100).toFixed(2)}%`;
    container.querySelector('#val-cand-recall').textContent = `${(cRec * 100).toFixed(2)}%`;

    if (val.true_positives !== undefined) {
      container.querySelector('#val-tp-fp').textContent = `TP: ${val.true_positives.toLocaleString()} | FP: ${val.false_positives.toLocaleString()}`;
      container.querySelector('#val-fn').textContent = `FN: ${val.false_negatives.toLocaleString()}`;
    }

    // Chart 1: Confidence Distribution
    const confDist = data.confidence_distribution || {};
    const totalConfEntries = Object.values(confDist).reduce((a, b) => a + b, 0) || 1;
    const confEl = container.querySelector('#chart-conf-dist');
    confEl.innerHTML = Object.entries(confDist).map(([range, count]) => {
      const pct = Math.round((count / totalConfEntries) * 100);
      return `
        <div class="mini-bar-row">
          <div class="mini-bar-label">${range}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width: ${pct}%; background-color: var(--accent);"></div>
          </div>
          <div class="mini-bar-val">${count.toLocaleString()} (${pct}%)</div>
        </div>
      `;
    }).join('');

    // Chart 2: Records by Country
    const countryDist = data.records_by_country || {};
    const totalCountryRecords = Object.values(countryDist).reduce((a, b) => a + b, 0) || 1;
    const countryEl = container.querySelector('#chart-country-dist');
    countryEl.innerHTML = Object.entries(countryDist).map(([country, count]) => {
      const pct = Math.round((count / totalCountryRecords) * 100);
      return `
        <div class="mini-bar-row">
          <div class="mini-bar-label">${country || 'Other'}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width: ${pct}%; background-color: #6366f1;"></div>
          </div>
          <div class="mini-bar-val">${count.toLocaleString()} (${pct}%)</div>
        </div>
      `;
    }).join('');

    // Chart 3: Source 2 vs Source 3 Matches
    const srcMatches = data.source_matches_breakdown || {};
    const totalSrcMatches = (srcMatches['Source 2'] || 0) + (srcMatches['Source 3'] || 0) || 1;
    const srcEl = container.querySelector('#chart-source-matches');
    srcEl.innerHTML = Object.entries(srcMatches).map(([src, count]) => {
      const pct = Math.round((count / totalSrcMatches) * 100);
      return `
        <div class="mini-bar-row">
          <div class="mini-bar-label">${src}</div>
          <div class="mini-bar-track">
            <div class="mini-bar-fill" style="width: ${pct}%; background-color: #10b981;"></div>
          </div>
          <div class="mini-bar-val">${count.toLocaleString()} (${pct}%)</div>
        </div>
      `;
    }).join('');

    container.querySelector('#analytics-loading').style.display = 'none';
    container.querySelector('#analytics-content').style.display = 'block';

  } catch (err) {
    container.querySelector('#analytics-loading').innerHTML = `
      <div class="empty-state-title" style="color: #ef4444;">Failed to load analytics</div>
      <div class="empty-state-desc">${err.message}</div>
    `;
  }
}
