// ====== CONFIG ======
const API_BASE = "http://localhost:3000"; // <-- cambia esto cuando subas tu backend
const FRONT_DASH_MVZ = "./mvz-dashboard.html";
const FRONT_DASH_PROP = "./propietario-dashboard.html";

// ====== UI: Pestañas ======
const tabs = document.querySelectorAll("#auth-tabs button");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const feedback = document.getElementById("auth-feedback");

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

// Obtener rol sugerido por query (?rol=mvz|propietario)
function rolSugerido(){
  const p = new URLSearchParams(location.search);
  const r = p.get("rol");
  return r === "mvz" || r === "propietario" ? r : null;
}

// Redirigir según rol
function gotoDashboard(rol){
  if (rol === "mvz")      location.href = FRONT_DASH_MVZ;
  else if (rol === "propietario") location.href = FRONT_DASH_PROP;
  else location.href = "./index.html";
}

// ====== LOGIN ======
formLogin.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = document.getElementById("log-email").value.trim();
  const pass  = document.getElementById("log-pass").value.trim();

  if (!API_BASE.startsWith("http")) {
    showMsg("API no configurada. Sube tu backend (Render) y ajusta API_BASE.", false);
    return;
  }

  try{
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password: pass, rolPreferido: rolSugerido() })
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({mensaje:`Error ${res.status}`}));
      showMsg(err.mensaje || "Credenciales inválidas.", false);
      return;
    }

    const data = await res.json();
    // Esperado: { token, usuario:{ rol, ... } }
    localStorage.setItem("token", data.token);
    localStorage.setItem("rol",   data.usuario?.rol || rolSugerido() || "propietario");
    showMsg("¡Bienvenido! Redirigiendo…", true);
    setTimeout(()=> gotoDashboard(localStorage.getItem("rol")), 500);
  }catch(err){
    showMsg("No se pudo conectar con la API. Revisa CORS/URL.", false);
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
    showMsg("API no configurada. Sube tu backend (Render) y ajusta API_BASE.", false);
    return;
  }

  try{
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        nombre, email, password: pass,
        rol: "propietario",
        ranchoNombre: rancho || null
      })
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({mensaje:`Error ${res.status}`}));
      showMsg(err.mensaje || "No se pudo crear la cuenta.", false);
      return;
    }

    // Muchos backends retornan {token, usuario}; si el tuyo no, haz un login aquí
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.usuario?.rol || "propietario");
      showMsg("Cuenta creada. Redirigiendo…", true);
      setTimeout(()=> gotoDashboard("propietario"), 500);
    } else {
      showMsg("Cuenta creada. Ahora inicia sesión.", true);
      tabs[0].click();
    }
  }catch(err){
    showMsg("No se pudo conectar con la API. Revisa CORS/URL.", false);
  }
});
