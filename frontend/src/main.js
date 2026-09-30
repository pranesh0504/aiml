import { renderLoginPage } from './pages/LoginPage.js';
import { renderDashboardPage } from './pages/DashboardPage.js';
import { renderEntityResolutionPage } from './pages/EntityResolutionPage.js';
import { renderMatchDetailsPage } from './pages/MatchDetailsPage.js';
import { renderAnalyticsPage } from './pages/AnalyticsPage.js';
import { renderDatasetPage } from './pages/DatasetPage.js';
import { renderSettingsPage } from './pages/SettingsPage.js';

const app = document.querySelector('#app');

let currentPage = 'dashboard';
let currentEntityId = null;

function isAuthenticated() {
  return Boolean(sessionStorage.getItem('auth_token'));
}

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem('user')) || { name: 'Data Lead', role: 'Resolution Engineer' };
  } catch {
    return { name: 'Data Lead', role: 'Resolution Engineer' };
  }
}

function renderApp() {
  if (!isAuthenticated()) {
    renderLoginPage(app, () => {
      currentPage = 'dashboard';
      renderApp();
    });
    return;
  }

  const user = getUser();

  app.innerHTML = `
    <div class="app-container">
      <!-- Left Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-icon">E</div>
          <span class="logo-text">EntityResolve</span>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-link ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
            <span>📊</span> Dashboard
          </a>
          <a class="nav-link ${currentPage === 'entities' ? 'active' : ''}" data-page="entities">
            <span>🔍</span> Entity Resolution
          </a>
          <a class="nav-link ${currentPage === 'analytics' ? 'active' : ''}" data-page="analytics">
            <span>📈</span> Analytics
          </a>
          <a class="nav-link ${currentPage === 'dataset' ? 'active' : ''}" data-page="dataset">
            <span>🗄️</span> Dataset
          </a>
          <a class="nav-link ${currentPage === 'settings' ? 'active' : ''}" data-page="settings">
            <span>⚙️</span> Settings
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-badge">
            <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div class="user-info">
              <span class="user-name">${user.name}</span>
              <span class="user-role">${user.role}</span>
            </div>
          </div>
          <button id="btn-logout" class="btn btn-secondary btn-sm" title="Sign Out" style="padding: 4px 8px; font-size: 11px;">
            Sign out
          </button>
        </div>
      </aside>

      <!-- Main Workspace Wrapper -->
      <div class="main-wrapper">
        <header class="top-bar">
          <div class="top-bar-left">
            <span class="top-bar-title" id="breadcrumb-title">Dashboard</span>
            <span class="top-bar-badge">Production Engine</span>
          </div>

          <div class="top-bar-right">
            <div style="font-size: 12px; color: var(--text-secondary); margin-right: 8px;">
              Ground Truth Active: <strong>F0.5 Optimized</strong>
            </div>
          </div>
        </header>

        <main id="main-content" style="flex: 1;">
          <!-- Active Page Mounted Here -->
        </main>
      </div>
    </div>
  `;

  // Attach Navigation Listeners
  app.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.dataset.page;
      navigateTo(targetPage);
    });
  });

  app.querySelector('#btn-logout').addEventListener('click', () => {
    sessionStorage.clear();
    renderApp();
  });

  mountCurrentPage();
}

function navigateTo(page, entityId = null) {
  currentPage = page;
  currentEntityId = entityId;

  // Update active state in sidebar
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update breadcrumb title
  const breadcrumb = document.querySelector('#breadcrumb-title');
  if (breadcrumb) {
    const titles = {
      dashboard: 'Entity Resolution Dashboard',
      entities: 'Entity Resolution',
      match: `Match Comparison: ${entityId}`,
      analytics: 'Resolution Analytics',
      dataset: 'Dataset Overview',
      settings: 'Matching Settings',
    };
    breadcrumb.textContent = titles[page] || 'EntityResolve';
  }

  mountCurrentPage();
}

function mountCurrentPage() {
  const contentEl = document.querySelector('#main-content');
  if (!contentEl) return;

  if (currentPage === 'dashboard') {
    renderDashboardPage(contentEl, navigateTo, (eid) => navigateTo('match', eid));
  } else if (currentPage === 'entities') {
    renderEntityResolutionPage(contentEl, (eid) => navigateTo('match', eid));
  } else if (currentPage === 'match') {
    renderMatchDetailsPage(contentEl, currentEntityId, () => navigateTo('entities'));
  } else if (currentPage === 'analytics') {
    renderAnalyticsPage(contentEl);
  } else if (currentPage === 'dataset') {
    renderDatasetPage(contentEl);
  } else if (currentPage === 'settings') {
    renderSettingsPage(contentEl);
  }
}

// Start application
renderApp();
