// Community pins backend (Supabase). Both values are safe to publish:
// the anon key can only do what supabase/schema.sql allows.
// Leave empty to run without community pins.
window.CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdefghijkl.supabase.co"
  supabaseAnonKey: "",  // Project Settings → API → anon public key
};
