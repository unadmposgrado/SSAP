import { isSupabaseConfigured, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./supabaseConfig.js";

let supabaseClient;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("La conexión con Supabase todavía no está configurada.");
    this.name = "SupabaseConfigurationError";
  }
}

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseConfigurationError();
  }

  if (!supabaseClient) {
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  }

  return supabaseClient;
}
