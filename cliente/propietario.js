// propietario-vacas.js — Listado + historial + eliminar (versión estable)

/* ===================== Auth básica ===================== */
const token = localStorage.getItem('token');
if (!token) window.location.href = './index.html';

/* ===================== Logout ===================== */
document.getElementById('boton-logout')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  sessionStorage.clear();
  window.location.href = './index.html';
});

/* ===================== Estado ===================== */
let TODAS_VACAS = [];
let FILTRADAS = [];

/* ===================== Carga inicial ===================== */
document.addEventListener('DOMContentLoaded', async () => {
  await cargarVacas();
  wireFiltroLocal();
  wireModalClose();
  wireSocketsOpcional();
});

/* ===================== API ===================== */
async function cargarVacas() {
  try {
    const r = await fetch('/api/vacas', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (r.status === 401) {
      localStorage.clear(); sessionStorage.clear();
      alert('Tu sesión expiró. Inicia sesión nuevamente.');
      window.location.href = './index.html';
      return;
    }
    if (r.status === 403) throw new Error('No tienes permisos para ver estas vacas.');

    if (!r.ok) throw new Error('No se pudo cargar la lista de vacas');

    TODAS_VACAS = await r.json();
    FILTRADAS = [...TODAS_VACAS];
    renderVacas(FILTRADAS);
  } catch (e) {
    console.error(e);
    alert(e.message || 'Error al cargar');
  }
}

async function fetchHistorial(vacaId) {
  const r = await fetch(`/api/vacas/${vacaId}/historial`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (r.status === 401) {
    localStorage.clear(); sessionStorage.clear();
    alert('Tu sesión expiró. Inicia sesión nuevamente.');
    window.location.href = './index.html';
    return [];
  }
  if (!r.ok) throw new Error('No se pudo cargar el historial');

  return r.json();
}

async function eliminarVaca(vacaId) {
  const ok = confirm('¿Eliminar esta vaca? Esta acción no se puede deshacer.');
  if (!ok) return;

  try {
    const r = await fetch(`/api/vacas/${vacaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (r.status === 401) {
      localStorage.clear(); sessionStorage.clear();
      alert('Tu sesión expiró. Inicia sesión nuevamente.');
      window.location.href = './index.html';
      return;
    }
    if (r.status === 403) throw new Error('No tienes permiso para eliminar esta vaca.');
    if (!r.ok) throw new Error('No se pudo eliminar la vaca. Inténtalo de nuevo.');

    alert('Vaca eliminada con éxito.');
    cargarVacas();
  } catch (e) {
    console.error('Error al eliminar vaca:', e);
    alert(e.message || 'Error al eliminar');
  }
}

/* ===================== Render ===================== */
function renderVacas(vacas) {
  const cont = document.getElementById('vacas-list');
  cont.innerHTML = '';

  if (!Array.isArray(vacas) || vacas.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'vaca-row';
    empty.textContent = 'No hay vacas registradas todavía.';
    empty.style.opacity = '.8';
    cont.appendChild(empty);
    return;
  }

  vacas.forEach(v => {
    const row = document.createElement('div');
    row.className = 'vaca-row';

    // Columnas
    row.appendChild(col(v.numero ?? '-', 'vaca-col'));
    row.appendChild(col(v.numero_pierna ?? '-', 'vaca-col'));
    row.appendChild(col(v.nombre ?? '-', 'vaca-col'));
    row.appendChild(col(v.raza ?? '-', 'vaca-col'));

    // Status como badge
    const cStatus = document.createElement('div');
    cStatus.className = 'vaca-col';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = v.status ?? '-';
    cStatus.appendChild(badge);
    row.appendChild(cStatus);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'row-actions';

    const btnHist = document.createElement('button');
    btnHist.className = 'btn-mini';
    btnHist.textContent = 'Historial';
    btnHist.addEventListener('click', () => abrirHistorialModal(v));
    actions.appendChild(btnHist);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-mini btn-danger';
    btnDel.innerHTML = '🗑️ Eliminar';
    btnDel.addEventListener('click', () => eliminarVaca(v.id));
    actions.appendChild(btnDel);

    row.appendChild(actions);
    cont.appendChild(row);
  });
}

function col(texto, cls = 'vaca-col') {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = texto;
  return d;
}

/* ===================== Modal de Historial ===================== */
async function abrirHistorialModal(vaca) {
  const modal = document.getElementById('historial-modal');
  const titulo = document.getElementById('historial-titulo');
  const resumen = document.getElementById('historial-resumen');
  const contenido = document.getElementById('historial-contenido');

  if (!modal || !titulo || !resumen || !contenido) return;

  titulo.textContent = `${vaca.numero}${vaca.nombre ? ' — ' + vaca.nombre : ''}`;
  resumen.innerHTML = `
    <span class="badge">Pierna: ${vaca.numero_pierna || '-'}</span>
    <span class="badge">Raza: ${vaca.raza || '-'}</span>
    <span class="badge">Status: ${vaca.status || '-'}</span>
  `;
  contenido.innerHTML = 'Cargando historial…';
  modal.style.display = 'block';

  try {
    const items = await fetchHistorial(vaca.id);
    if (!Array.isArray(items) || items.length === 0) {
      contenido.innerHTML = '<div class="rancho-item-placeholder">Sin eventos registrados.</div>';
      return;
    }

    // Timeline simple
    const frag = document.createDocumentFragment();
    items.forEach(ev => {
      const div = document.createElement('div');
      div.style.padding = '8px 0';
      const fecha = ev.fecha_evento ? new Date(ev.fecha_evento).toLocaleString('es-MX') : '-';
      const quien = ev.mvz_nombre ? ` — ${ev.mvz_nombre}` : '';
      div.textContent = `${fecha}${quien} — ${ev.descripcion || ''}`;
      frag.appendChild(div);
    });
    contenido.innerHTML = '';
    contenido.appendChild(frag);
  } catch (e) {
    console.error(e);
    contenido.innerHTML = '<div class="rancho-item-placeholder">Error al cargar historial.</div>';
  }
}

function wireModalClose() {
  const modal = document.getElementById('historial-modal');
  const cerrar = document.getElementById('historial-cerrar');
  cerrar?.addEventListener('click', () => modal.style.display = 'none');
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

/* ===================== Filtro local ===================== */
function wireFiltroLocal() {
  const input = document.getElementById('filtro-vacas');
  const list = document.getElementById('vacas-list');
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    // Filtra en memoria
    const vacas = TODAS_VACAS.filter(v => {
      const texto = [
        v.numero, v.numero_pierna, v.nombre, v.raza, v.status
      ].map(x => (x || '').toString().toLowerCase()).join(' ');
      return texto.includes(q);
    });
    FILTRADAS = vacas;
    renderVacas(FILTRADAS);
  });
}

/* ===================== Socket.IO opcional ===================== */
function wireSocketsOpcional() {
  // Solo si cargaste socket.io y tu backend emite eventos
  if (typeof io !== 'function') return;
  try {
    const socket = io({ transports: ['websocket', 'polling'] });
    // Escucha eventos que emitas desde el servidor para refrescar
    // Por ejemplo:
    socket.on('vaca_actualizada', () => cargarVacas());
    socket.on('procedimiento_finalizado', () => cargarVacas());
  } catch {
    // Silencioso si no hay socket
  }
}
