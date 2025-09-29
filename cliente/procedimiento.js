/* =========================================
   procedimiento.js — EL ÚNICO CONTROLADOR
   Maneja todo: eventos, renderizado inicial, búsqueda y API.
   ========================================= */

// ---------------- Seguridad ----------------
const __token = localStorage.getItem('token');
if (!__token) {
  location.href = './index.html';
}

// ---------------- Estado Global ----------------
// (compatibilidad con tu otro archivo; dejamos accesible en window)
window.sesionDeTrabajo = window.sesionDeTrabajo || [];
window.vacaSeleccionada = window.vacaSeleccionada || null;

// Utilidad: setear vaca elegida desde el buscador
window.__setVacaSeleccionada = function (vacaObj) {
  window.vacaSeleccionada = {
    id: vacaObj.id,
    numero: vacaObj.numero,
    numero_pierna: vacaObj.numero_pierna || null,
    nombre: vacaObj.nombre || ''
  };
  const detalles = document.getElementById('vaca-encontrada-detalles');
  if (detalles) {
    detalles.classList.remove('hidden');
    detalles.innerHTML = `
      <div class="rancho-item">
        <div><strong>Seleccionada:</strong> 🐄 ${vacaObj.numero} ${vacaObj.nombre ? `— ${vacaObj.nombre}` : ''}</div>
        ${vacaObj.numero_pierna ? `<div># Pierna: ${vacaObj.numero_pierna}</div>` : ''}
      </div>
    `;
  }
};

// ---------------- Helpers ----------------
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function normalizeTipo(t) {
  if (!t) return '';
  const base = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  switch (base) {
    case 'palpacion': return 'palpación';
    case 'inseminacion': return 'inseminación';
    case 'transferencia': 
    case 'transferencia de embrion': return 'transferencia de embrión';
    case 'sincronizacion': return 'sincronización';
    case 'medicamento':
    case 'aplicacion de medicamento': return 'aplicación de medicamento';
    default: return t;
  }
}
function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}
function $(id){ return document.getElementById(id); }

// ---------------- Lectura inicial ----------------
const ranchoId =
  sessionStorage.getItem('ranchoIdActual') ||
  sessionStorage.getItem('ranchoActivoId');

const ranchoNombre =
  sessionStorage.getItem('ranchoNombreActual') ||
  sessionStorage.getItem('ranchoActivoNombre') ||
  '';

const tipoParam = getQueryParam('tipo');               // sin acentos en URL
const tipoHumano = normalizeTipo(tipoParam || '');     // con acentos
const config = (typeof PROCEDIMIENTOS !== 'undefined') ? PROCEDIMIENTOS[tipoParam] : null;

// ---------------- Render inicial ----------------
document.addEventListener('DOMContentLoaded', () => {
  if (!config) {
    document.body.innerHTML = '<h1 style="padding:24px">Error: Tipo de procedimiento no válido.</h1>';
    return;
  }

  // Título dinámico
  const titulo = document.getElementById('procedimiento-titulo');
  if (titulo) {
    titulo.textContent = `Sesión de ${config.titulo}${ranchoNombre ? ` en ${ranchoNombre}` : ''}`;
  }

  // Construye formulario dinámico con tu helper (si existe)
  const hostCampos = $('campos-dinamicos');
  if (hostCampos && typeof renderFormulario === 'function') {
    renderFormulario(hostCampos, config);
  }

  // Tabla de sesión (si tu helper existe, úsalo; si no, usamos fallback)
  if (typeof refrescarTablaSesion === 'function') {
    refrescarTablaSesion(config);
  } else {
    __refrescarTablaSesionFallback();
  }

  // Buscar vaca (solo si hay rancho activo)
  setupBusquedaVaca();

  // Botones
  $('btn-agregar')?.addEventListener('click', () => onAgregar(config));
  $('btn-finalizar')?.addEventListener('click', () => onFinalizar(config));
  $('btn-back')?.addEventListener('click', () => history.back());
  $('btn-logout')?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    location.href = './index.html';
  });
});

// ---------------- Acciones ----------------
function onAgregar(config) {
  // 1) Intenta con la función normal
  let datos = tomarDatos(config);

  // 2) Si por cualquier razón devuelve null, armamos el objeto “a mano”
  if (!datos) {
    // intenta encontrar el número de vaca en varias opciones
    const manualEl = document.querySelector(
      '#vaca-manual, #numero-vaca, input[name="vaca-manual"], input[name="numero-vaca"]'
    );
    const numManual = (manualEl?.value || '').trim();
    const sel = (window.vacaSeleccionada || null);
    const numeroVaca = numManual || (sel?.numero || '');

    if (!numeroVaca) {
      alert('Debes seleccionar o introducir una vaca primero.');
      manualEl?.focus();
      return;
    }

    // construye el resultado leyendo los campos del formulario
    const resultado = {};
    (config.campos || []).forEach((campo) => {
      const el = document.getElementById(campo.id);
      if (!el) return;
      if (campo.tipo === 'checkbox') {
        resultado[campo.id] = el.checked ? 'Sí' : 'No';
      } else {
        resultado[campo.id] = (el.value || '').trim();
      }
    });

    const parts = [];
    if (resultado.gestante === 'Sí') parts.push(`Gestante: ${resultado.gestante_detalle || 'Sí'}`);
    if (resultado.ciclando === 'Sí') parts.push(`Ciclando: ${resultado.ciclando_detalle || 'Sí'}`);
    if (resultado.estatica === 'Sí') parts.push('Estática');
    if (resultado.sucia === 'Sí') parts.push('Sucia');
    const resumen = parts.length ? parts.join(' | ') : 'Vaca Vacía';

    datos = {
      vacaId: numManual ? null : (sel?.id || null),
      numeroVaca,
      resultado,
      resumen,
      fechaISO: new Date().toISOString()
    };
  }

  // 3) agrega y refresca
  sesionDeTrabajo.push(datos);
  refrescarTablaSesion(config);
  limpiarFormulario(config);
}


async function onFinalizar(config) {
  if (!window.sesionDeTrabajo.length) {
    alert('No hay registros para finalizar.');
    return;
  }

  const btn = $('btn-finalizar');
  if (btn) { btn.textContent = 'Generando...'; btn.disabled = true; }

  try {
    const r = await fetch('/api/procedimientos/finalizar', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ranchoId: ranchoId || null,
        tipo: config.titulo || tipoHumano || tipoParam, // el back normaliza
        resultados: window.sesionDeTrabajo
      })
    });

    if (r.status === 401) {
      localStorage.clear(); sessionStorage.clear();
      alert('Tu sesión expiró. Inicia sesión nuevamente.');
      location.href = './index.html';
      return;
    }

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error || 'El servidor no pudo generar el PDF.');
    }

    // Descarga PDF
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const filename = `reporte_${(config.titulo||tipoHumano||'procedimiento').replace(/\s+/g,'_')}_${Date.now()}.pdf`;

    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    alert('¡Reporte descargado!');
    // Limpia contexto de rancho si quieres cerrar sesión de trabajo
    // (si prefieres conservarlo para otra sesión, comenta estas 2 líneas)
    sessionStorage.removeItem('ranchoIdActual');
    sessionStorage.removeItem('ranchoNombreActual');

    location.href = './mvz-dashboard.html';
  } catch (e) {
    alert(`Error: ${e.message}`);
  } finally {
    if (btn) { btn.textContent = 'Finalizar y Descargar PDF'; btn.disabled = false; }
  }
}

// ---------------- Búsqueda de vacas ----------------
function setupBusquedaVaca() {
  const seccion = $('seccion-busqueda');
  if (!ranchoId || !seccion) return;

  seccion.style.display = 'block';
  const tipoEl  = $('tipo-busqueda');
  const valorEl = $('valor-busqueda');
  const cont    = $('vaca-encontrada-detalles');

  const buscar = async () => {
    const tipo  = tipoEl?.value || 'numero_siniiga';
    const valor = (valorEl?.value || '').trim();
    if (valor.length < 3) {
      if (cont) cont.innerHTML = '';
      return;
    }

    if (cont) cont.innerHTML = 'Buscando…';

    try {
      const qs = new URLSearchParams({ [tipo]: valor });
      const resp = await fetch(`/api/rancho/${ranchoId}/buscar-vaca?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (resp.status === 401) {
        localStorage.clear(); sessionStorage.clear();
        alert('Tu sesión expiró. Inicia sesión nuevamente.');
        location.href = './index.html';
        return;
      }

      if (!resp.ok) throw new Error('No se pudo buscar.');

      const vacas = await resp.json();
      if (!Array.isArray(vacas) || vacas.length === 0) {
        if (cont) cont.innerHTML = '<div class="rancho-item-placeholder">Sin resultados.</div>';
        return;
      }

      if (cont) {
        cont.classList.remove('hidden');
        cont.innerHTML = vacas.map(v => `
          <div class="resultado-vaca rancho-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span>🐄 <strong>${v.numero}</strong> ${v.nombre ? `— ${v.nombre}` : ''}</span>
            <button class="btn-mini btn usar-vaca" data-vaca='${JSON.stringify(v)}'>Usar</button>
          </div>
        `).join('');
        cont.querySelectorAll('.usar-vaca').forEach(btn => {
          btn.addEventListener('click', () => {
            const vacaObj = JSON.parse(btn.getAttribute('data-vaca'));
            window.__setVacaSeleccionada(vacaObj);
            alert(`Vaca seleccionada: ${vacaObj.numero} ✅`);
          });
        });
      }
    } catch (e) {
      if (cont) cont.innerHTML = '<div class="rancho-item-placeholder">Error al buscar.</div>';
    }
  };

  if (valorEl)  valorEl.addEventListener('input', debounce(buscar, 350));
  if (tipoEl)   tipoEl.addEventListener('change', buscar);
}

// ---------------- Fallbacks (por si tu otro archivo no los define) ----------------
function __tomarDatosBasicoDesdeFormulario() {
  // Lee inputs/selects dentro de #campos-dinamicos para armar un objeto plano
  const host = $('campos-dinamicos');
  const data = {};
  if (!host) return data;
  host.querySelectorAll('input, select, textarea').forEach(el => {
    const key = el.name || el.id || el.getAttribute('data-field') || el.type + '_' + Math.random().toString(36).slice(2,7);
    let val = (el.type === 'checkbox') ? el.checked : el.value;
    data[key] = val;
  });
  // Adjunta también vaca seleccionada si no lo hace tomarDatos custom
  return data;
}

function __construirResumen(resultado) {
  // Intenta construir un resumen corto entendible
  if (!resultado || typeof resultado !== 'object') return '';
  const claves = Object.keys(resultado);
  const trozos = [];
  for (const k of claves) {
    const v = resultado[k];
    if (v === true) trozos.push(`${k}: sí`);
    else if (v === false) trozos.push(`${k}: no`);
    else if (v != null && String(v).trim() !== '') trozos.push(`${k}: ${v}`);
    if (trozos.length >= 4) break;
  }
  return trozos.join(' | ');
}

function __refrescarTablaSesionFallback() {
  const host = $('tabla-sesion');
  if (!host) return;
  if (!window.sesionDeTrabajo.length) {
    host.innerHTML = '<div class="rancho-item-placeholder">No hay registros en esta sesión.</div>';
    return;
  }
  host.innerHTML = `
    <div class="rancho-list">
      ${window.sesionDeTrabajo.map((it, i) => `
        <div class="rancho-item">
          <div><strong>#${i+1}</strong> — Vaca: ${it.numeroVaca || it.vacaId}</div>
          <div style="font-size:12px;color:#9fb3c8; margin-top:6px;">
            ${it.resumen ? it.resumen : '(sin resumen)'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function onFinalizar(config) {
  if (sesionDeTrabajo.length === 0) return alert('No hay registros para finalizar.');

  const btn = document.getElementById('btn-finalizar');
  btn.textContent = 'Generando...';
  btn.disabled = true;

  try {
    const ranchoId =
      sessionStorage.getItem('ranchoActivoId') ||
      sessionStorage.getItem('ranchoIdActual') ||
      null;

    const ranchoNombreManual =
      sessionStorage.getItem('ranchoActivoNombre') ||
      sessionStorage.getItem('ranchoNombreActual')  ||
      sessionStorage.getItem('ranchoNombreManual')  ||
      null;

    const respuesta = await fetch('/api/procedimientos/finalizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({
        ranchoId,
        ranchoNombreManual,        // <-- NUEVO
        tipo: config.titulo,
        resultados: sesionDeTrabajo
      })
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => ({}));
      throw new Error(errorData.error || 'El servidor no pudo generar el PDF.');
    }

    const blob = await respuesta.blob();
    const filename = `reporte_${config.titulo}_${Date.now()}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    alert('¡Reporte descargado!');
    // Limpia solo lo manual; si el rancho venía por código, lo conservamos
    sessionStorage.removeItem('ranchoNombreManual');

    location.href = './mvz-dashboard.html';
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    btn.textContent = 'Finalizar y Descargar PDF';
    btn.disabled = false;
  }
}
