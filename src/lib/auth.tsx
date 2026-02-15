'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session as SupabaseSession } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from './supabase';

interface AuthContextType {
  user: User | null;
  session: SupabaseSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(
      ({ data: { session: s } }: { data: { session: SupabaseSession | null } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, s: SupabaseSession | null) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables and redeploy.' };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: `Connection failed: ${(err as Error).message}. Check that your Supabase URL is correct.` };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables and redeploy.' };
    }
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: `Connection failed: ${(err as Error).message}. Check that your Supabase URL is correct.` };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out errors
    }
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
