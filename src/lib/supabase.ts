import { createBrowserClient } from '@supabase/ssr';

// Fallbacks prevent @supabase/ssr from throwing during Next.js static
// page prerendering (e.g. /_not-found) where env vars aren't set.
// The client is only actually used at runtime in the browser.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
