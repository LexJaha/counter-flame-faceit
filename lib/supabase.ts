import { createClient } from "@supabase/supabase-js";

// Publishable keys are designed for browser use. RLS is the security boundary;
// never place a service_role or secret key in this file.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mojzxdlpojwkgplavmwx.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_L7p4-oTzRbgOCYxAm2bwrQ_sQwrB7Vj";

export const supabase = url && key ? createClient(url, key) : null;
