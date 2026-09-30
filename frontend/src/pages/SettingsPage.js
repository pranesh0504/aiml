import { api } from '../api.js';

export async function renderSettingsPage(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure matching pipeline weights, decision thresholds, and view system status.</p>
        </div>
      </div>

      <div class="section-block" style="max-width: 800px; margin-bottom: 24px;">
        <h2 class="section-title">Matching Pipeline Parameters</h2>
        <form id="settings-form">
          <div class="form-group">
            <label class="form-label" for="setting-name-weight">
              Business Name Weight: <strong id="lbl-name-weight">0.60</strong>
            </label>
            <input type="range" id="setting-name-weight" min="0.1" max="0.9" step="0.05" value="0.60" style="width: 100%;" />
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Weight given to business name similarity in combined matching score.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="setting-addr-weight">
              Address Weight: <strong id="lbl-addr-weight">0.40</strong>
            </label>
            <input type="range" id="setting-addr-weight" min="0.1" max="0.9" step="0.05" value="0.40" disabled style="width: 100%; opacity: 0.6;" />
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Automatically calibrated to (1.0 - Name Weight).
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="setting-threshold">
              Match Decision Threshold: <strong id="lbl-threshold">0.65</strong>
            </label>
            <input type="range" id="setting-threshold" min="0.40" max="0.95" step="0.01" value="0.65" style="width: 100%;" />
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Minimum combined similarity score required to accept candidate pair as a true match.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="setting-topk">Top-K Candidate Retrieval Limit</label>
            <select id="setting-topk" class="select-input" style="width: 160px;">
              <option value="10">Top 10</option>
              <option value="20" selected>Top 20 (Standard)</option>
              <option value="50">Top 50 (High Recall)</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; margin-top: 24px;">
            <button type="submit" id="btn-save-settings" class="btn btn-primary">
              Save Configuration
            </button>
            <span id="save-status-msg" style="font-size: 13px; color: #059669; display: none;">Saved!</span>
          </div>
        </form>
      </div>

      <!-- System & Database Status -->
      <div class="section-block" style="max-width: 800px;">
        <h2 class="section-title">System & Storage Status</h2>
        <div class="table-wrapper">
          <table class="data-table">
            <tbody>
              <tr>
                <td style="font-weight: 600; width: 220px;">Database Engine</td>
                <td>SQLite 3 (WAL mode enabled, in-memory temp store)</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Text Normalization</td>
                <td>Unicode NFKC, Multilingual character preservation, Address abbreviation expansion</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Candidate Generation</td>
                <td>Country Blocking + Character 3-gram TF-IDF Inverted Index</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Evaluation Ground Truth</td>
                <td>train_ground_truth.tsv (127 MB, 2,206,822 ground truth mappings)</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Output Files</td>
                <td>
                  <div><code>output/matching_results.tsv</code> (Generated)</div>
                  <div style="margin-top: 2px;"><code>output/candidate_pairs.tsv</code> (Generated)</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const nameWeightInput = container.querySelector('#setting-name-weight');
  const addrWeightInput = container.querySelector('#setting-addr-weight');
  const thresholdInput = container.querySelector('#setting-threshold');
  const topkSelect = container.querySelector('#setting-topk');

  const lblName = container.querySelector('#lbl-name-weight');
  const lblAddr = container.querySelector('#lbl-addr-weight');
  const lblThresh = container.querySelector('#lbl-threshold');
  const statusMsg = container.querySelector('#save-status-msg');

  // Load existing settings
  try {
    const res = await api.getSettings();
    const cfg = res.data;
    if (cfg) {
      nameWeightInput.value = cfg.name_weight || 0.60;
      addrWeightInput.value = (1.0 - parseFloat(nameWeightInput.value)).toFixed(2);
      thresholdInput.value = cfg.threshold || 0.65;
      topkSelect.value = String(cfg.top_k || 20);

      lblName.textContent = nameWeightInput.value;
      lblAddr.textContent = addrWeightInput.value;
      lblThresh.textContent = thresholdInput.value;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  nameWeightInput.addEventListener('input', () => {
    const val = parseFloat(nameWeightInput.value);
    lblName.textContent = val.toFixed(2);
    const addrVal = (1.0 - val).toFixed(2);
    addrWeightInput.value = addrVal;
    lblAddr.textContent = addrVal;
  });

  thresholdInput.addEventListener('input', () => {
    lblThresh.textContent = parseFloat(thresholdInput.value).toFixed(2);
  });

  container.querySelector('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        name_weight: parseFloat(nameWeightInput.value),
        address_weight: parseFloat(addrWeightInput.value),
        threshold: parseFloat(thresholdInput.value),
        top_k: parseInt(topkSelect.value, 10),
      });
      statusMsg.style.display = 'inline';
      setTimeout(() => {
        statusMsg.style.display = 'none';
      }, 3000);
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  });
}
