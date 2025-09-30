
// ====== CONFIG ======
const API_BASE =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:3000"                   // dev local
    : "https://ganaderia-jfb.onrender.com";     // producción (Render)

const FRONT_DASH_MVZ  = "./mvz-dashboard.html";
const FRONT_DASH_PROP = "./propietario-dashboard.html";

// ====== UI: Pestañas ======
const tabs        = document.querySelectorAll("#auth-tabs button");
const formLogin   = document.getElementById("form-login");
const formRegister= document.getElementById("form-register");
const feedback    = document.getElementById("auth-feedback");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    if (tab === "login") {
      formLogin.classList.remove("hidden");
      formRegister.classList.add("hidden");
    } else {
      formRegister.classList.remove("hidden");
      formLogin.classList.add("hidden");
    }
    feedback.classList.add("hidden");
    feedback.textContent = "";
  });
});

// ====== Helpers ======
function showMsg(msg, ok=false){
  feedback.textContent = msg;
  feedback.classList.remove("hidden");
  feedback.style.color = ok ? "var(--accent)" : "var(--danger, #e11d48)";
}

function rolSugerido(){
  const r = new URLSearchParams(location.search).get("rol");
  return (r === "mvz" || r === "propietario") ? r : null;
}

function gotoDashboard(rol){
  if (rol === "mvz")             location.href = FRONT_DASH_MVZ;
  else if (rol === "propietario")location.href = FRONT_DASH_PROP;
  else                           location.href = "./index.html";
}

// Wrapper fetch con manejo de JSON/errores
async function apiFetch(path, options={}){
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers||{}) },
    ...options
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) {
    const msg = body?.error || body?.mensaje || `Error ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

// ====== LOGIN ======
formLogin.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = document.getElementById("log-email").value.trim();
  const pass  = document.getElementById("log-pass").value.trim();

  if (!API_BASE.startsWith("http")) {
    showMsg("API no configurada. Ajusta API_BASE.", false);
    return;
  }

  try{
    const data = await apiFetch("/api/auth/login", {
      method:"POST",
      body: JSON.stringify({ email, password: pass, rolPreferido: rolSugerido() })
    });

    // Esperado: { token, usuario:{ rol, ... } }
    localStorage.setItem("token", data.token);
    localStorage.setItem("rol",   data.usuario?.rol || rolSugerido() || "propietario");
    showMsg("¡Bienvenido! Redirigiendo…", true);
    setTimeout(()=> gotoDashboard(localStorage.getItem("rol")), 500);
  }catch(err){
    showMsg(err.message || "No se pudo iniciar sesión.", false);
  }
});

// ====== REGISTRO ======
formRegister.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const nombre = document.getElementById("reg-nombre").value.trim();
  const rancho = document.getElementById("reg-rancho").value.trim();
  const email  = document.getElementById("reg-email").value.trim();
  const pass   = document.getElementById("reg-pass").value.trim();

  if (!API_BASE.startsWith("http")) {
    showMsg("API no configurada. Ajusta API_BASE.", false);
    return;
  }

  try{
    // Tu backend espera: nombre, email, password, rancho_nombre
    const data = await apiFetch("/api/auth/register", {
      method:"POST",
      body: JSON.stringify({
        nombre,
        email,
        password: pass,
        rancho_nombre: rancho || null
      })
    });

    // Si devuelve token, inicia sesión directa; si no, avisa
    if (data?.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.usuario?.rol || "propietario");
      showMsg("Cuenta creada. Redirigiendo…", true);
      setTimeout(()=> gotoDashboard("propietario"), 600);
    } else {
      showMsg("Cuenta creada. Ahora inicia sesión.", true);
      tabs[0].click(); // cambiar a pestaña login
    }
  }catch(err){
    showMsg(err.message || "No se pudo crear la cuenta.", false);
  }
});

