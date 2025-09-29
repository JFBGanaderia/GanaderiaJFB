// propietario-dashboard.js — versión estable

document.addEventListener("DOMContentLoaded", () => {
  // Guardia rápida: si no hay token, vuelve al inicio
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "./index.html";
    return;
  }

  cargarDatosDelRancho();
  configurarBotones();
});

async function cargarDatosDelRancho() {
  const nombreSpan = document.getElementById("rancho-nombre");
  const codigoSpan = document.getElementById("rancho-codigo");
  const btnCopiar  = document.getElementById("btn-copiar-codigo");

  // Mientras carga, deshabilita el botón copiar
  btnCopiar?.setAttribute("disabled", "true");

  try {
    const respuesta = await fetch("/api/mi-rancho", {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });

    // Manejo explícito de sesiones expiradas o sin permiso
    if (respuesta.status === 401) {
      // token inválido/expirado
      localStorage.clear();
      sessionStorage.clear();
      alert("Tu sesión expiró. Inicia sesión nuevamente.");
      location.href = "./index.html";
      return;
    }
    if (respuesta.status === 403) {
      throw new Error("Acción no permitida para este usuario.");
    }

    const txt = await respuesta.text();
    let rancho = {};
    try { rancho = JSON.parse(txt); } catch {}

    if (!respuesta.ok) {
      const msg = (rancho && rancho.error) ? rancho.error : `Error ${respuesta.status}`;
      throw new Error(msg);
    }

    // Pintar datos
    nombreSpan.textContent = rancho?.nombre || "No encontrado";
    codigoSpan.textContent = rancho?.codigo_acceso || "N/A";

    // Guarda ID y nombre para otras vistas del propietario (por conveniencia)
    if (rancho?.id) {
      sessionStorage.setItem("ranchoPropietarioId", String(rancho.id));
      sessionStorage.setItem("ranchoPropietarioNombre", rancho.nombre || "");
    }

    // Habilita copiar si hay código válido
    if (rancho?.codigo_acceso) btnCopiar?.removeAttribute("disabled");

  } catch (error) {
    console.error("Error al cargar datos del rancho:", error);
    nombreSpan.textContent = "Error al cargar";
    codigoSpan.textContent = "Error";
  }
}

function configurarBotones() {
  document.getElementById("boton-logout")?.addEventListener("click", () => {
    localStorage.clear();
    sessionStorage.clear();
    location.href = "./index.html";
  });

  document.getElementById("btn-copiar-codigo")?.addEventListener("click", async () => {
    const codigo = document.getElementById("rancho-codigo")?.textContent?.trim();
    if (!codigo || codigo === "Cargando…" || codigo === "Error" || codigo === "N/A") return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codigo);
      } else {
        // Fallback para navegadores antiguos
        const ta = document.createElement("textarea");
        ta.value = codigo;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      alert("Código copiado al portapapeles: " + codigo);
    } catch {
      alert("No se pudo copiar automáticamente. Selecciona y copia el código manualmente.");
    }
  });
}
