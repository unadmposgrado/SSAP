import { getSupabaseClient } from "./supabaseClient.js";

export async function registerAccount(email, password, fullName) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function signIn(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signOut() {
  const client = await getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getAuthenticatedUser() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

export async function getAuthenticatedProfile() {
  const client = await getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return getProfileByUserId(userId);
}

export async function getProfileByUserId(userId) {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, role, account_status, program_id, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }

  return data;
}

export async function getSession() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function getAuthErrorMessage(error) {
  if (error?.name === "SupabaseConfigurationError") {
    return "La autenticación aún no está configurada. Consulta CONFIGURACION.md.";
  }

  if (error?.name === "AuthRetryableFetchError" || error instanceof TypeError) {
    return "No fue posible conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.";
  }

  switch (error?.code) {
    case "invalid_credentials":
      return "El correo electrónico o la contraseña no son correctos.";
    case "email_not_confirmed":
      return "Confirma tu correo electrónico antes de iniciar sesión.";
    case "user_already_exists":
      return "No se pudo crear la cuenta con esos datos. Si ya tienes una cuenta, inicia sesión.";
    case "weak_password":
      return "La contraseña no cumple los requisitos de seguridad de este proyecto.";
    case "over_email_send_rate_limit":
      return "Se alcanzó el límite temporal de envíos de correo. Inténtalo más tarde.";
    case "signup_disabled":
      return "El registro de cuentas está deshabilitado en la configuración de autenticación.";
    case "email_address_invalid":
      return "Escribe una dirección de correo electrónico válida.";
    case "user_banned":
      return "No es posible iniciar sesión con esta cuenta. Contacta con soporte.";
    default:
      return "No se pudo completar la operación. Inténtalo de nuevo más tarde.";
  }
}
