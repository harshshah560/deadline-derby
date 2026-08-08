import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values.",
  );
}

// Untyped client: hand-written row shapes live in database.types.ts and are
// applied at the call site (`as Project`, etc.) rather than threaded through
// supabase-js's generic Database type, which needs a full schema shape we
// don't have until `supabase gen types` runs against a real linked project.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
