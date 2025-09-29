/* =======================================================
   procedimientos-config-y-formulario.js — EL CEREBRO
   Define estructura de formularios y helpers de UI/lectura.
   (No redefine globals; usa window.* creados en procedimiento.js)
   ======================================================= */

/* Opcional: si quieres incrustar un logotipo en base64 dentro de PDFs, ponlo aquí.
   Si no lo usas, déjalo en cadena vacía. */
const logoBase64 = ""; 
// Ejemplo: const logoBase64 = "data:image/png;base64,AAA...";

/* =========================
   CONFIGURACIÓN DE FORMAS
   ========================= */
const PROCEDIMIENTOS = {
  palpacion: {
    titulo: "Palpación",
    camposPdf: ["estatica", "ciclando", "ciclando_detalle", "gestante", "gestante_detalle", "sucia", "observaciones"],
    campos: [
      { id: "estatica", label: "Estática", tipo: "select", opciones: ["Sí", "No"] },
      { id: "ciclando", label: "Ciclando", tipo: "select", opciones: ["Sí", "No"], revela: "ciclando_detalle" },
      { id: "ciclando_detalle", label: "Detalle Ciclo", tipo: "select", opciones: ["I1", "I2", "I3", "D1", "D2", "D3"], oculto: true },
      { id: "gestante", label: "Gestante", tipo: "select", opciones: ["Sí", "No"], revela: "gestante_detalle" },
      { id: "gestante_detalle", label: "Edad Gestacional", tipo: "select", opciones: ["1 a 3 meses", "3 a 6 meses", "6 a 9 meses"], oculto: true },
      { id: "sucia", label: "Sucia", tipo: "checkbox" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" }
    ]
  },
  inseminacion: {
    titulo: "Inseminación",
    camposPdf: ["tecnica", "fecha_celo", "pajilla_toro", "dosis", "observaciones"],
    campos: [
      { id: "tecnica", label: "Técnica", tipo: "select", opciones: ["IATF", "IA Convencional"], revela: "fecha_celo" },
      { id: "fecha_celo", label: "Fecha/Hora de Celo Detectado", tipo: "datetime-local", oculto: true },
      { id: "pajilla_toro", label: "Pajilla / Toro", tipo: "text", placeholder: "Nombre del toro" },
      { id: "dosis", label: "Dosis", tipo: "select", opciones: ["1 dosis", "2 dosis", "3 dosis", "4 dosis"] },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" }
    ]
  },
  transferencia: {
    titulo: "Transferencia de Embrión",
    camposPdf: ["donadora", "toro_embrion", "produccion", "lado", "lado_detalle", "observaciones"],
    campos: [
      { id: "donadora", label: "Vaca Donadora", tipo: "text" },
      { id: "toro_embrion", label: "Toro del Embrión", tipo: "text" },
      { id: "produccion", label: "Producción", tipo: "select", opciones: ["MOET", "FIV"] },
      { id: "lado", label: "Lado", tipo: "select", opciones: ["Izquierdo", "Derecho"], revela: "lado_detalle" },
      { id: "lado_detalle", label: "Detalle (Opcional)", tipo: "select", opciones: ["1", "2", "3"], oculto: true },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" }
    ]
  },
  sincronizacion: {
    titulo: "Sincronización",
    camposPdf: ["protocolo", "protocolo_otro", "fecha_inicio", "fecha_fin", "hormonas", "observaciones"],
    campos: [
      { id: "protocolo", label: "Protocolo", tipo: "select", opciones: ["Ovsynch", "Presynch", "CIDR", "Otros"], revela: "protocolo_otro" },
      { id: "protocolo_otro", label: "Especificar Otro Protocolo", tipo: "text", oculto: true },
      { id: "fecha_inicio", label: "Fecha Inicio", tipo: "date" },
      { id: "fecha_fin", label: "Fecha Fin", tipo: "date" },
      { id: "hormonas", label: "Hormonas y Esquema", tipo: "textarea" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" }
    ]
  },
  medicamento: {
    titulo: "Aplicación de Medicamento",
    camposPdf: ["farmaco", "dosis", "via", "lote", "caducidad", "observaciones"],
    campos: [
      { id: "farmaco", label: "Fármaco", tipo: "text" },
      { id: "dosis", label: "Dosis", tipo: "text" },
      { id: "via", label: "Vía", tipo: "select", opciones: ["IM", "IV", "SC", "VO", "Tópica"] },
      { id: "lote", label: "Lote", tipo: "text" },
      { id: "caducidad", label: "Caducidad", tipo: "date" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" }
    ]
  }
};

// === Helpers de Ranchos ===
function getRanchoActivo() {
  const id = sessionStorage.getItem('ranchoActivoId') || sessionStorage.getItem('ranchoIdActual') || null;
  const nombre =
    sessionStorage.getItem('ranchoActivoNombre') ||
    sessionStorage.getItem('ranchoNombreActual')  ||
    sessionStorage.getItem('ranchoNombreManual')  || null;

  return { id, nombre };
}

function setRanchoManual(nombre) {
  const nom = (nombre || '').trim();
  if (!nom) return;
  sessionStorage.setItem('ranchoNombreManual', nom);
}

// Mostrar/ocultar la sección para capturar rancho manual
(function initRanchoManualUI(){
  const sec = document.getElementById('seccion-rancho-manual');
  const inp = document.getElementById('rancho-manual');
  const { id, nombre } = getRanchoActivo();

  if (!sec) return;

  if (!id) {
    sec.style.display = 'block';
    // Prefill si ya lo guardó antes en esta sesión
    if (nombre) inp.value = nombre;
    // Guardar al salir del campo
    inp?.addEventListener('change', () => setRanchoManual(inp.value));
    inp?.addEventListener('blur',   () => setRanchoManual(inp.value));
  } else {
    sec.style.display = 'none'; // ya hay rancho activo por código
  }
})();


/* =========================
   RENDER DEL FORMULARIO
   ========================= */
function renderFormulario(host, config) {
  if (!host || !config) return;
  host.innerHTML = '';

  // SIEMPRE campo manual
  const divVacaManual = document.createElement('div');
  divVacaManual.className = 'campo';
  divVacaManual.innerHTML = `
    <label for="vaca-manual">Número de Vaca *</label>
    <input id="vaca-manual" type="text" placeholder="SINIIGA o pierna">
  `;
  host.appendChild(divVacaManual);

  // (opcional) si hay rancho, muestra además el de “vaca seleccionada”
  const ranchoId = sessionStorage.getItem('ranchoIdActual') || sessionStorage.getItem('ranchoActivoId');
  if (ranchoId) {
    const divVacaSel = document.createElement('div');
    divVacaSel.className = 'campo';
    divVacaSel.innerHTML = `
      <label>Vaca seleccionada (si usas el buscador)</label>
      <input id="vaca-seleccionada" disabled placeholder="Usa el buscador de arriba...">
    `;
    host.appendChild(divVacaSel);
  }

  // pinta el resto de campos como ya lo tienes…
  (config.campos || []).forEach((campo) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'campo';
    if (campo.oculto) wrapper.style.display = 'none';

    let fieldHTML = `<label for="${campo.id}">${campo.label}</label>`;
    switch (campo.tipo) {
      case 'select':
        fieldHTML += `<select id="${campo.id}">
          <option value="">Seleccione...</option>
          ${campo.opciones.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
        break;
      case 'textarea':
        fieldHTML += `<textarea id="${campo.id}" rows="3" placeholder="${campo.placeholder || ''}"></textarea>`;
        break;
      case 'checkbox':
        wrapper.classList.add('campo-checkbox');
        fieldHTML = `<input type="checkbox" id="${campo.id}"><label for="${campo.id}">${campo.label}</label>`;
        break;
      default:
        fieldHTML += `<input type="${campo.tipo || 'text'}" id="${campo.id}" placeholder="${campo.placeholder || ''}">`;
    }
    wrapper.innerHTML = fieldHTML;
    host.appendChild(wrapper);

    if (campo.revela) {
      document.getElementById(campo.id)?.addEventListener('change', (e) => {
        const objetivo = document.getElementById(campo.revela)?.closest('.campo');
        if (!objetivo) return;
        const v = e.target.value;
        const mostrar = (v === 'Sí') || (v === 'IA Convencional') || (v === 'Izquierdo') || (v === 'Derecho') || (v === 'Otros');
        objetivo.style.display = mostrar ? 'flex' : 'none';
      });
    }
  });
}


/* =========================
   TOMAR DATOS DEL FORM
   ========================= */
function tomarDatos(config) {
  if (!config) return null;

  // 1) Detectar número de vaca escrito o seleccionado (sin depender de ranchoId)
  //    Soporta varios ids/names por si cambió en el HTML.
  const manualEl = document.querySelector(
    '#vaca-manual, #numero-vaca, input[name="vaca-manual"], input[name="numero-vaca"]'
  );
  const numManual = (manualEl?.value || '').trim();

  const sel = (window.vacaSeleccionada || null);
  const numeroVaca = numManual || (sel?.numero || '');

  if (!numeroVaca) return null; // ahora sí, no hay información

  // 2) Leer campos del formulario definidos en config
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

  // 3) Resumen corto
  const parts = [];
  if (resultado.gestante === 'Sí') parts.push(`Gestante: ${resultado.gestante_detalle || 'Sí'}`);
  if (resultado.ciclando === 'Sí') parts.push(`Ciclando: ${resultado.ciclando_detalle || 'Sí'}`);
  if (resultado.estatica === 'Sí') parts.push('Estática');
  if (resultado.sucia === 'Sí') parts.push('Sucia');
  const resumen = parts.length ? parts.join(' | ') : 'Vaca Vacía';

  // 4) Si fue manual no hay id; si fue del buscador sí lo hay
  const vacaId = numManual ? null : (sel?.id || null);

  return {
    vacaId,
    numeroVaca,
    resultado,
    resumen,
    fechaISO: new Date().toISOString()
  };
}

/* =========================
   TABLA DE SESIÓN
   ========================= */
function refrescarTablaSesion(config) {
  const host = document.getElementById("tabla-sesion");
  if (!host) return;

  const lista = window.sesionDeTrabajo || [];
  if (!lista.length) {
    host.innerHTML = '<div class="rancho-item-placeholder">Aún no hay registros en esta sesión.</div>';
    return;
  }

  const rows = lista.map((item, idx) => `
    <tr>
      <td><strong>${item.numeroVaca}</strong></td>
      <td>${item.resumen || "(sin resumen)"}</td>
      <td>${new Date(item.fechaISO).toLocaleTimeString("es-MX")}</td>
    </tr>
  `).join("");

  host.innerHTML = `
    <div class="table-wrap" style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.1);">Vaca</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.1);">Resumen</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.1);">Hora</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* =========================
   LIMPIAR FORMULARIO
   ========================= */
function limpiarFormulario(config) {
  if (!config) return;

  config.campos.forEach((campo) => {
    const el = document.getElementById(campo.id);
    if (!el) return;

    if (campo.tipo === "checkbox") el.checked = false;
    else el.value = "";

    // Oculta dependientes nuevamente
    if (campo.revela) {
      const objetivo = document.getElementById(campo.revela)?.closest(".campo");
      if (objetivo) objetivo.style.display = "none";
    }
  });

  // Limpiar selección de vaca
  window.vacaSeleccionada = null;

  const ranchoId =
    sessionStorage.getItem("ranchoIdActual") ||
    sessionStorage.getItem("ranchoActivoId");

  if (ranchoId) {
    const v = document.getElementById("valor-busqueda");
    const d = document.getElementById("vaca-encontrada-detalles");
    const s = document.getElementById("vaca-seleccionada");
    if (v) v.value = "";
    if (d) d.innerHTML = "";
    if (s) s.value = "";
    v?.focus();
  } else {
    const m = document.getElementById("vaca-manual");
    if (m) { m.value = ""; m.focus(); }
  }
}

/* Exponer símbolos en window (por claridad) */
window.PROCEDIMIENTOS = PROCEDIMIENTOS;
window.renderFormulario = renderFormulario;
window.tomarDatos = tomarDatos;
window.refrescarTablaSesion = refrescarTablaSesion;
window.limpiarFormulario = limpiarFormulario;
