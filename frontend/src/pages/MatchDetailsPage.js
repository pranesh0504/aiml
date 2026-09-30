import { api } from '../api.js';

export async function renderMatchDetailsPage(container, entityId, onBack) {
  container.innerHTML = `
    <div class="page-container">
      <div style="margin-bottom: 20px;">
        <button id="btn-back" class="btn btn-secondary btn-sm">
          ← Back to Records
        </button>
      </div>

      <div id="match-loading" class="empty-state">
        <div class="empty-state-title">Loading match details...</div>
        <div class="empty-state-desc">Retrieving entity resolution comparison for ${entityId}</div>
      </div>

      <div id="match-content" style="display: none;">
        <!-- Header Profile -->
        <div class="section-block" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span class="entity-id-badge" style="font-size: 14px; padding: 4px 8px;">${entityId}</span>
                <span id="match-status-badge" class="badge">Status</span>
              </div>
              <h1 id="match-title" class="page-title" style="margin-bottom: 4px;">Business Name</h1>
              <div id="match-country" style="font-size: 13px; color: var(--text-secondary);">Country: -</div>
            </div>
            
            <div style="text-align: right; background: var(--bg-secondary); padding: 14px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 2px;">Overall Confidence</div>
              <div id="match-confidence-hero" style="font-size: 28px; font-weight: 800; color: var(--accent);">-</div>
            </div>
          </div>
        </div>

        <!-- Section 1: Side-by-Side Source Comparison -->
        <h2 class="section-title">Source Comparison</h2>
        <div class="match-comparison-grid" id="source-comparison-grid">
          <!-- Populated by JS -->
        </div>

        <!-- Section 2: Similarity Analysis -->
        <div class="section-block" style="margin-bottom: 24px;">
          <h2 class="section-title">Similarity Analysis</h2>
          <div style="max-width: 700px;">
            <div class="similarity-row">
              <div class="similarity-header">
                <span>Business Name Similarity</span>
                <span id="score-name-pct">0%</span>
              </div>
              <div class="progress-track">
                <div id="bar-name" class="progress-fill medium" style="width: 0%;"></div>
              </div>
            </div>

            <div class="similarity-row">
              <div class="similarity-header">
                <span>Address Similarity</span>
                <span id="score-address-pct">0%</span>
              </div>
              <div class="progress-track">
                <div id="bar-address" class="progress-fill medium" style="width: 0%;"></div>
              </div>
            </div>

            <div class="similarity-row" style="margin-bottom: 0;">
              <div class="similarity-header">
                <span>Overall Match Score (Combined)</span>
                <span id="score-combined-pct" style="color: var(--accent); font-weight: 700;">0%</span>
              </div>
              <div class="progress-track">
                <div id="bar-combined" class="progress-fill high" style="width: 0%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Matching Evidence -->
        <div class="section-block" style="margin-bottom: 24px;">
          <h2 class="section-title">Matching Evidence</h2>
          <ul class="evidence-list" id="evidence-list">
            <!-- Populated by JS -->
          </ul>
        </div>

        <!-- Section 4: Candidate Pairs Generated (Pre-threshold inspection) -->
        <div class="section-block">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h2 class="section-title" style="margin-bottom: 2px;">Candidate Pairs Generated Before Scoring</h2>
              <div style="font-size: 13px; color: var(--text-muted);">
                Candidates retrieved via Country Blocking & Character 3-gram TF-IDF before decision thresholding.
              </div>
            </div>
            <span id="candidates-count-badge" class="badge badge-unmatched">0 Candidates</span>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Candidate ID</th>
                  <th>Source</th>
                  <th>Candidate Business</th>
                  <th>Candidate Address</th>
                  <th>Name Sim</th>
                  <th>Addr Sim</th>
                  <th>Combined Score</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody id="candidates-tbody">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', onBack);

  try {
    const res = await api.getMatchDetails(entityId);
    const data = res.data;
    const s1 = data.source1;
    const s2Matches = data.source2_matches || [];
    const s3Matches = data.source3_matches || [];
    const sim = data.similarity_analysis || {};

    // Header values
    container.querySelector('#match-title').textContent = s1.business_name;
    container.querySelector('#match-country').textContent = `Country / Region: ${s1.country}`;
    const heroConf = Math.round(sim.combined_score * 100);
    container.querySelector('#match-confidence-hero').textContent = `${heroConf}%`;

    const statusBadge = container.querySelector('#match-status-badge');
    statusBadge.textContent = data.resolution_status;
    statusBadge.className = `badge ${
      data.resolution_status === 'High Confidence' ? 'badge-high' :
      data.resolution_status === 'Resolved' ? 'badge-resolved' : 'badge-unmatched'
    }`;

    // Source comparison grid
    const compGrid = container.querySelector('#source-comparison-grid');
    let cardsHtml = `
      <div class="source-card reference">
        <div class="source-card-header">
          <div>
            <div class="source-card-title">SOURCE 1</div>
            <div class="source-card-role">Reference Entity</div>
          </div>
          <span class="source-tag">S1</span>
        </div>
        <div class="field-group">
          <div class="field-label">Entity ID</div>
          <div class="field-value"><span class="entity-id-badge">${s1.entity_id}</span></div>
        </div>
        <div class="field-group">
          <div class="field-label">Business Name</div>
          <div class="field-value" style="font-weight: 600;">${s1.business_name}</div>
        </div>
        <div class="field-group">
          <div class="field-label">Business Address</div>
          <div class="field-value">${s1.business_address || '<span style="color:var(--text-muted);">None</span>'}</div>
        </div>
        <div class="field-group" style="margin-bottom: 0;">
          <div class="field-label">Country</div>
          <div class="field-value">${s1.country}</div>
        </div>
      </div>
    `;

    // Only show Source 2 if match exists
    s2Matches.forEach(m => {
      cardsHtml += `
        <div class="source-card matched">
          <div class="source-card-header">
            <div>
              <div class="source-card-title">SOURCE 2</div>
              <div class="source-card-role">Matched Record</div>
            </div>
            <span class="source-tag">S2</span>
          </div>
          <div class="field-group">
            <div class="field-label">Entity ID</div>
            <div class="field-value"><span class="entity-id-badge">${m.entity_id}</span></div>
          </div>
          <div class="field-group">
            <div class="field-label">Business Name</div>
            <div class="field-value" style="font-weight: 600;">${m.business_name}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Business Address</div>
            <div class="field-value">${m.business_address || '<span style="color:var(--text-muted); font-style:italic;">Address missing in S2 record</span>'}</div>
          </div>
          <div class="field-group" style="margin-bottom: 0;">
            <div class="field-label">Country</div>
            <div class="field-value">${m.country}</div>
          </div>
        </div>
      `;
    });

    // Only show Source 3 if match exists
    s3Matches.forEach(m => {
      cardsHtml += `
        <div class="source-card matched">
          <div class="source-card-header">
            <div>
              <div class="source-card-title">SOURCE 3</div>
              <div class="source-card-role">Matched Record</div>
            </div>
            <span class="source-tag">S3</span>
          </div>
          <div class="field-group">
            <div class="field-label">Entity ID</div>
            <div class="field-value"><span class="entity-id-badge">${m.entity_id}</span></div>
          </div>
          <div class="field-group">
            <div class="field-label">Business Name</div>
            <div class="field-value" style="font-weight: 600;">${m.business_name}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Business Address</div>
            <div class="field-value">${m.business_address || '<span style="color:var(--text-muted); font-style:italic;">Address missing in S3 record</span>'}</div>
          </div>
          <div class="field-group" style="margin-bottom: 0;">
            <div class="field-label">Country</div>
            <div class="field-value">${m.country}</div>
          </div>
        </div>
      `;
    });

    if (s2Matches.length === 0 && s3Matches.length === 0) {
      cardsHtml += `
        <div class="source-card" style="border-top: 4px solid var(--border-light); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No Matches in Source 2 or 3</div>
          <div style="font-size: 13px;">This reference entity is unique or has no candidate exceeding the match threshold.</div>
        </div>
      `;
    }

    compGrid.innerHTML = cardsHtml;

    // Progress Bars
    const namePct = Math.round(sim.name_similarity * 100);
    const addrPct = Math.round(sim.address_similarity * 100);
    const combPct = Math.round(sim.combined_score * 100);

    container.querySelector('#score-name-pct').textContent = `${namePct}%`;
    container.querySelector('#bar-name').style.width = `${namePct}%`;

    container.querySelector('#score-address-pct').textContent = `${addrPct}%`;
    container.querySelector('#bar-address').style.width = `${addrPct}%`;

    container.querySelector('#score-combined-pct').textContent = `${combPct}%`;
    container.querySelector('#bar-combined').style.width = `${combPct}%`;

    // Evidence List
    const evidenceUl = container.querySelector('#evidence-list');
    evidenceUl.innerHTML = (data.evidence || []).map(e => `
      <li class="evidence-item">
        <span class="evidence-check">✓</span>
        <span>${e}</span>
      </li>
    `).join('');

    // Fetch and render Candidate Pairs generated before thresholding
    const candRes = await api.getCandidates(entityId);
    const candidates = candRes.data.candidates || [];
    container.querySelector('#candidates-count-badge').textContent = `${candidates.length} Candidates`;

    const candTbody = container.querySelector('#candidates-tbody');
    if (candidates.length === 0) {
      candTbody.innerHTML = `<tr><td colspan="8" class="empty-state">No candidate pairs generated.</td></tr>`;
    } else {
      candTbody.innerHTML = candidates.map(c => {
        const isMatched = (c.combined_score >= 0.65);
        const decBadge = isMatched
          ? `<span class="badge badge-resolved">Accepted</span>`
          : `<span class="badge badge-unmatched">Rejected (&lt;0.65)</span>`;

        return `
          <tr>
            <td><span class="entity-id-badge">${c.candidate_entity_id}</span></td>
            <td><span class="source-tag">${c.candidate_source}</span></td>
            <td style="font-weight: 500;">${c.business_name}</td>
            <td style="font-size: 12px; color: var(--text-secondary);">${c.business_address || '—'}</td>
            <td>${Math.round(c.name_similarity * 100)}%</td>
            <td>${Math.round(c.address_similarity * 100)}%</td>
            <td><strong>${Math.round(c.combined_score * 100)}%</strong></td>
            <td>${decBadge}</td>
          </tr>
        `;
      }).join('');
    }

    container.querySelector('#match-loading').style.display = 'none';
    container.querySelector('#match-content').style.display = 'block';

  } catch (err) {
    container.querySelector('#match-loading').innerHTML = `
      <div class="empty-state-title" style="color: #ef4444;">Error loading entity</div>
      <div class="empty-state-desc">${err.message}</div>
    `;
  }
}
