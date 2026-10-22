import { getAuthErrorMessage, registerAccount } from "../auth.js";
import { isSupabaseConfigured } from "../supabaseConfig.js";

const form = document.querySelector("#register-form");
const status = document.querySelector("#register-status");
const submitButton = form.querySelector('button[type="submit"]');
const buttonLabel = submitButton.querySelector("[data-button-label]");
const emailRedirectTo = "https://unadmposgrado.github.io/SSAP/login.html";

function setStatus(message, state = "") {
  status.textContent = message;
  if (state) {
    status.dataset.state = state;
  } else {
    delete status.dataset.state;
  }
}

if (!isSupabaseConfigured()) {
  setStatus("La autenticación aún no está configurada. Consulta CONFIGURACION.md.", "error");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  if (!form.reportValidity()) {
    return;
  }

  const fullName = form.elements.full_name.value.trim();
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const confirmPassword = form.elements.confirmPassword.value;

  if (!fullName) {
    setStatus("Escribe tu nombre completo.", "error");
    form.elements.full_name.focus();
    return;
  }

  if (password !== confirmPassword) {
    setStatus("Las contraseñas no coinciden.", "error");
    form.elements.confirmPassword.focus();
    return;
  }

  submitButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  buttonLabel.textContent = "Creando cuenta…";
  setStatus("Procesando tu registro…");

  try {
    const data = await registerAccount(email, password, fullName, emailRedirectTo);
    if (data.session) {
      setStatus("Tu cuenta se creó y la sesión está activa. El destino de la aplicación está pendiente de definirse.", "success");
    } else {
      setStatus("Tu cuenta se creó. Revisa tu correo y confirma la dirección antes de iniciar sesión.", "success");
    }
    form.reset();
  } catch (error) {
    setStatus(getAuthErrorMessage(error), "error");
  } finally {
    submitButton.disabled = false;
    form.removeAttribute("aria-busy");
    buttonLabel.textContent = "Crear cuenta";
  }
});
