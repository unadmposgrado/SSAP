import { getAuthErrorMessage, signIn } from "../auth.js";
import { isSupabaseConfigured } from "../supabaseConfig.js";

const form = document.querySelector("#login-form");
const status = document.querySelector("#login-status");
const submitButton = form.querySelector('button[type="submit"]');
const buttonLabel = submitButton.querySelector("[data-button-label]");

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

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  submitButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  buttonLabel.textContent = "Iniciando sesión…";
  setStatus("Verificando tus datos…");

  try {
    await signIn(email, password);
    setStatus("Inicio de sesión correcto. Tu sesión está activa; el destino posterior está pendiente de definirse.", "success");
    form.reset();
  } catch (error) {
    setStatus(getAuthErrorMessage(error), "error");
  } finally {
    submitButton.disabled = false;
    form.removeAttribute("aria-busy");
    buttonLabel.textContent = "Inicia sesión";
  }
});
