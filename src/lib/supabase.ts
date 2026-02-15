import { createBrowserClient } from '@supabase/ssr';

// NEXT_PUBLIC_ env vars are replaced at BUILD time by Next.js.
// They MUST be set in Vercel project settings before deploying.
// The placeholder fallback only exists so `next build` doesn't crash
// during static prerendering of pages like /_not-found.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    SUPABASE_ANON_KEY !== 'placeholder'
  );
}
