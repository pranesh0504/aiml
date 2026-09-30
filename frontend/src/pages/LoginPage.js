import { api } from '../api.js';

export function renderLoginPage(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-brand">
          <div class="login-logo">E</div>
          <h1 class="login-title">Business Entity Resolution</h1>
          <p class="login-subtitle">Resolve noisy business records into trusted entities.</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-email">Work Email</label>
            <input type="email" id="login-email" class="input-text" placeholder="name@company.com" value="engineer@enterprise.ai" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input type="password" id="login-password" class="input-text" placeholder="••••••••••••" value="resolution2026" required />
          </div>

          <div style="margin-bottom: 20px;">
            <button type="submit" id="btn-signin" class="btn btn-primary" style="width: 100%;">
              Sign In
            </button>
          </div>

          <div style="text-align: center; border-top: 1px solid var(--border-light); padding-top: 20px;">
            <button type="button" id="btn-demo" class="btn btn-secondary" style="width: 100%;">
              Launch Demo Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const demoBtn = container.querySelector('#btn-demo');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value;
    const password = container.querySelector('#login-password').value;
    try {
      const res = await api.login(email, password, false);
      sessionStorage.setItem('auth_token', res.data.token);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess();
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  });

  demoBtn.addEventListener('click', async () => {
    try {
      const res = await api.login('', '', true);
      sessionStorage.setItem('auth_token', res.data.token);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess();
    } catch (err) {
      alert('Demo entry failed: ' + err.message);
    }
  });
}
