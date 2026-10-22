import { getAuthErrorMessage, getAuthenticatedProfile, signIn, signOut } from "../auth.js";
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
  console.info("[SSAP login] Envío del formulario iniciado.");

  if (submitButton.disabled) {
    console.info("[SSAP login] Envío repetido omitido: ya hay una operación en curso.");
    return;
  }

  setStatus("");

  if (!form.reportValidity()) {
    console.info("[SSAP login] Operación finalizada: formulario no válido.");
    return;
  }

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  submitButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  buttonLabel.textContent = "Iniciando sesión…";
  setStatus("Verificando tus datos…");

  let authenticationSucceeded = false;
  let phase = "autenticación";
  let outcome = "error";
  try {
    await signIn(email, password);
    authenticationSucceeded = true;
    console.info("[SSAP login] Autenticación completada.");

    phase = "consulta del perfil";
    setStatus("Autenticación correcta. Consultando tu perfil…");
    console.info("[SSAP login] Consulta del perfil iniciada.");
    const profile = await getAuthenticatedProfile();
    console.info("[SSAP login] Perfil recibido.", { found: Boolean(profile) });

    if (!profile) {
      console.info("[SSAP login] Validación del perfil terminada: perfil inexistente.");
      outcome = "perfil inexistente";
      await denyAccess("No encontramos un perfil asociado a tu cuenta. No se concedió acceso.");
      return;
    }

    if (profile.account_status !== "activo") {
      console.info("[SSAP login] Validación del perfil terminada: cuenta no activa.");
      outcome = "cuenta no activa";
      await denyAccess("Tu cuenta no está activa. No se concedió acceso; contacta con soporte.");
      return;
    }

    if (profile.role !== "admin" && profile.role !== "estudiante") {
      console.info("[SSAP login] Validación del perfil terminada: rol no reconocido.");
      outcome = "rol no reconocido";
      await denyAccess("El rol de tu cuenta no está reconocido. No se concedió acceso; contacta con soporte.");
      return;
    }

    console.info("[SSAP login] Validación del perfil terminada: perfil válido.");
    setStatus(
      "Inicio de sesión correcto. Tu perfil está verificado; el dashboard correspondiente aún no está disponible.",
      "success",
    );
    outcome = "perfil válido";
    form.reset();
  } catch (error) {
    console.info("[SSAP login] Error durante la operación.", {
      phase,
      errorName: error?.name || "Error",
    });
    if (authenticationSucceeded) {
      outcome = "error de consulta del perfil";
      await denyAccess("No se pudo verificar tu perfil. No se concedió acceso; inténtalo de nuevo más tarde.");
    } else {
      setStatus(getAuthErrorMessage(error), "error");
    }
  } finally {
    submitButton.disabled = false;
    form.removeAttribute("aria-busy");
    buttonLabel.textContent = "Inicia sesión";
    console.info("[SSAP login] Operación finalizada.", { outcome });
  }
});

async function denyAccess(message) {
  try {
    await signOut();
  } catch {
    console.info("[SSAP login] No fue posible cerrar la sesión tras denegar el acceso.");
    setStatus(`${message} No fue posible cerrar la sesión; vuelve a intentarlo.`, "error");
    return;
  }

  setStatus(message, "error");
}
