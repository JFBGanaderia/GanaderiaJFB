// auth.js — Login / Registro con tabs (sin rol en formularios)
(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- Redirección si ya hay sesión ----------
  try {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (token && rol) {
      goToDashboard(rol);
      return;
    }
  } catch {}

  // ---------- Toggle de pestañas ----------
  const tabs = document.querySelectorAll('#auth-tabs .tab');
  const formLogin = $('form-login');
  const formReg   = $('form-register');

  function showTab(which) {
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === which));
    formLogin.classList.toggle('hidden', which !== 'login');
    formReg.classList.toggle('hidden', which !== 'register');
  }
  // estado inicial
  showTab('login');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // ---------- LOGIN ----------
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      email: $('log-email').value.trim(),
      password: $('log-pass').value
    };
    if (!payload.email || !payload.password) {
      alert('Completa email y contraseña.');
      return;
    }

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (!r.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('rol', data.rol);      // 'mvz' | 'propietario'
      localStorage.setItem('usuarioId', data.id);

      goToDashboard(data.rol);
    } catch (err) {
      alert(err.message || 'Error al iniciar sesión.');
    }
  });

  // ---------- REGISTRO (propietario + creación de rancho) ----------
  formReg?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      nombre: $('reg-nombre').value.trim(),
      email: $('reg-email').value.trim(),
      password: $('reg-pass').value,
      rancho_nombre: $('reg-rancho').value.trim() || null
    };
    if (!payload.nombre || !payload.email || !payload.password) {
      alert('Completa nombre, email y contraseña.');
      return;
    }

    try {
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (r.status === 409) throw new Error(data.error || 'El correo ya está registrado.');
      if (!r.ok)           throw new Error(data.error || 'No se pudo registrar.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('rol', data.rol);      // será 'propietario'
      localStorage.setItem('usuarioId', data.id);

      goToDashboard(data.rol);
    } catch (err) {
      alert(err.message || 'Error al registrar.');
    }
  });

  // ---------- Util ----------
  function goToDashboard(rol) {
    if (rol === 'mvz') location.href = './mvz-dashboard.html';
    else               location.href = './propietario-dashboard.html';
  }
})();
