export const SUPABASE_URL = "https://gnznehkcwytdimiyjrwi.supabase.co";
export const SUPABASE_PUBLIC_KEY = "sb_publishable_LTVcoY-HaOonv5XmB2OwMg_5uWc5tzZ";

export function isSupabaseConfigured() {
  try {
    const projectUrl = new URL(SUPABASE_URL);
    return projectUrl.protocol === "https:"
      && projectUrl.hostname.length > 0
      && SUPABASE_PUBLIC_KEY !== "REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY"
      && SUPABASE_PUBLIC_KEY.trim().length > 0;
  } catch {
    return false;
  }
}
