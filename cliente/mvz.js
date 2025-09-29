// mvz.js — Panel MVZ (modo con rancho o manual)

// 1) Guardia de seguridad
const token = localStorage.getItem('token');
if (!token) location.href = './index.html';

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ---
  const formBuscarRancho = document.getElementById('form-buscar-rancho');
  const inputCodigo      = document.getElementById('codigo-acceso');
  const btnCerrarSesion  = document.getElementById('cerrar-sesion-mvz');
  const feedback         = document.getElementById('mvz-rancho-feedback'); // opcional

  // --- Feedback helper ---
  function setFeedback(msg, tipo = 'info') {
    if (!feedback) {
      // respaldo si no existe el div
      if (tipo === 'warn') console.warn(msg);
      else console.log(msg);
      return;
    }
    feedback.classList.remove('hidden');
    feedback.textContent = msg;
    feedback.style.border = '1px solid rgba(255,255,255,.12)';
    feedback.style.background = (
      tipo === 'ok'   ? 'rgba(34,197,94,.12)'  :
      tipo === 'warn' ? 'rgba(245,158,11,.12)' :
                        'rgba(0,0,0,.15)'
    );
  }

  // --- Guarda rancho en sessionStorage (claves antiguas y nuevas para compat) ---
  function saveRanchoSession(rancho) {
    const id = String(rancho.id || '');
    const nombre = rancho.nombre || 'Rancho';

    // Claves antiguas (algunas pantallas las leen)
    sessionStorage.setItem('ranchoIdActual', id);
    sessionStorage.setItem('ranchoNombreActual', nombre);

    // Claves nuevas (preferidas)
    sessionStorage.setItem('ranchoActivoId', id);
    sessionStorage.setItem('ranchoActivoNombre', nombre);

    // Al entrar por código, borra el nombre manual si lo hubiera
    sessionStorage.removeItem('ranchoNombreManual');

    console.log('[MVZ] Rancho guardado:', { id, nombre });
  }

  // --- Mensaje si estamos en modo manual (sin rancho)
  const ranchoIdActual =
    sessionStorage.getItem('ranchoIdActual') ||
    sessionStorage.getItem('ranchoActivoId');

  if (!ranchoIdActual) {
    setFeedback(
      'No has accedido a un rancho. Puedes iniciar una actividad en modo manual (pondrás el nombre del rancho y el número de la vaca en el formulario una sola vez).',
      'warn'
    );
  }

  // --- Acceso a rancho por código ---
  if (formBuscarRancho) {
    formBuscarRancho.addEventListener('submit', async (e) => {
      e.preventDefault();

      const codigo = (inputCodigo?.value || '').trim();
      if (!codigo) {
        setFeedback('Ingresa el código de acceso del rancho.', 'warn');
        inputCodigo?.focus();
        return;
      }

      const submitBtn = formBuscarRancho.querySelector('button[type="submit"]');
      submitBtn?.setAttribute('disabled', 'true');

      try {
        const resp = await fetch('/api/acceder-rancho', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ codigo_acceso: codigo })
        });

        // Si el backend no tenía protegerRuta, aquí te daba 401/500: ya lo corregimos arriba
        if (resp.status === 401) {
          localStorage.clear();
          sessionStorage.clear();
          alert('Tu sesión expiró. Inicia sesión nuevamente.');
          location.href = './index.html';
          return;
        }

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo acceder al rancho.');
        if (!data?.rancho?.id) throw new Error('Respuesta inesperada del servidor.');

        saveRanchoSession(data.rancho);
        setFeedback(`¡Acceso exitoso al rancho: ${data.rancho.nombre}!`, 'ok');

        // Opcional: refrescar para que el resto de la UI lea el rancho
        // location.reload();

      } catch (err) {
        console.error('[MVZ] Error al acceder al rancho:', err);
        setFeedback(`Error: ${err.message}`, 'warn');
      } finally {
        submitBtn?.removeAttribute('disabled');
      }
    });
  }

  // --- Cerrar sesión ---
  btnCerrarSesion?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    location.href = './index.html';
  });
});
