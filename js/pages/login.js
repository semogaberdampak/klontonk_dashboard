import { Auth } from '../auth.js';
import { UI } from '../ui.js';
import { APP_VERSION } from '../config.js';

// ============ HALAMAN LOGIN ADMIN PLATFORM ============
// Memakai EMAIL + PASSWORD. Akunnya harus terdaftar di tabel platform_admins
// (lihat README bagian "Pasang sekali"). Tanpa baris itu, login akan ditolak.

export function renderLogin() {
  return `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-head">
          <div class="login-logo">K</div>
          <h1>Klontonk Dashboard</h1>
          <p>Manajemen client, langganan, dan log</p>
        </div>

        <form class="login-form" id="loginForm" novalidate>
          <div class="field">
            <label for="loginEmail">Email admin platform</label>
            <input type="email" id="loginEmail" name="email" autocomplete="username"
                   placeholder="nama@contoh.com" required />
          </div>
          <div class="field">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" name="password" autocomplete="current-password"
                   placeholder="Password" required />
          </div>
          <div class="form-error" id="loginError" hidden></div>
          <button type="submit" class="btn btn-primary" id="loginSubmit">Masuk</button>
        </form>

        <p class="login-note">v${APP_VERSION} &middot; khusus admin platform (vendor)</p>
      </div>
    </div>`;
}

export function initLogin() {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmit');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  const tampilkanError = (pesan) => {
    errorEl.textContent = pesan;
    errorEl.hidden = false;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;

    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      tampilkanError('Email dan password wajib diisi.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
    try {
      const hasil = await Auth.login(email, password);
      if (hasil.success) {
        UI.toast(`Selamat datang, ${hasil.admin.name}.`, { type: 'success' });
        setTimeout(() => window.location.reload(), 300);
      } else {
        tampilkanError(hasil.error);
        passInput.value = '';
        passInput.focus();
      }
    } catch (err) {
      console.error('[Login] gagal:', err);
      tampilkanError('Terjadi kesalahan. Coba lagi.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
    }
  });

  setTimeout(() => emailInput.focus(), 80);
}