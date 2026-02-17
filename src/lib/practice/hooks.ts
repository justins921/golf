'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../supabase';
import type { PracticeSession, PracticeShot, PracticeMode, DrillCategory, PracticeLocation } from './types';
import type { ScoringSettings } from './scoring';
import { DEFAULT_SCORING } from './scoring';

// ============================================================
// Practice sessions hook
// ============================================================

export function usePracticeSessions() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSessions(data as PracticeSession[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async (session: {
    mode: PracticeMode;
    program_id?: string | null;
    category?: DrillCategory | null;
    drill_id?: string | null;
    location?: PracticeLocation | null;
    plan?: object | null;
    notes?: string | null;
  }): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        mode: session.mode,
        program_id: session.program_id ?? null,
        category: session.category ?? null,
        drill_id: session.drill_id ?? null,
        location: session.location ?? null,
        plan: session.plan ?? null,
        notes: session.notes ?? null,
      })
      .select('id')
      .single();

    if (!error && data) {
      await fetchSessions();
      return data.id;
    }
    return null;
  };

  const completeSession = async (id: string, notes?: string) => {
    const updates: Record<string, unknown> = { completed_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    const { error } = await supabase
      .from('practice_sessions')
      .update(updates)
      .eq('id', id);
    if (!error) await fetchSessions();
    return error;
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('id', id);
    if (!error) await fetchSessions();
    return error;
  };

  return { sessions, loading, refetch: fetchSessions, createSession, completeSession, deleteSession };
}

// ============================================================
// Practice shots hook
// ============================================================

export function usePracticeShots(sessionId: string | null) {
  const [shots, setShots] = useState<PracticeShot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchShots = useCallback(async () => {
    if (!sessionId) {
      setShots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('practice_shots')
      .select('*')
      .eq('practice_session_id', sessionId)
      .order('timestamp', { ascending: true });
    if (!error && data) setShots(data as PracticeShot[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchShots(); }, [fetchShots]);

  const addShot = async (shot: Omit<PracticeShot, 'id'>): Promise<PracticeShot | null> => {
    const { data, error } = await supabase
      .from('practice_shots')
      .insert(shot)
      .select('*')
      .single();
    if (!error && data) {
      setShots((prev) => [...prev, data as PracticeShot]);
      return data as PracticeShot;
    }
    return null;
  };

  const undoLastShot = async (): Promise<boolean> => {
    if (shots.length === 0) return false;
    const last = shots[shots.length - 1];
    const { error } = await supabase
      .from('practice_shots')
      .delete()
      .eq('id', last.id);
    if (!error) {
      setShots((prev) => prev.slice(0, -1));
      return true;
    }
    return false;
  };

  const toggleMishit = async (id: string) => {
    const shot = shots.find((s) => s.id === id);
    if (!shot) return;
    const { error } = await supabase
      .from('practice_shots')
      .update({ is_mishit: !shot.is_mishit })
      .eq('id', id);
    if (!error) {
      setShots((prev) => prev.map((s) => s.id === id ? { ...s, is_mishit: !s.is_mishit } : s));
    }
  };

  return { shots, loading, refetch: fetchShots, addShot, undoLastShot, toggleMishit };
}

// ============================================================
// All practice shots (for insights)
// ============================================================

export function useAllPracticeShots() {
  const [shots, setShots] = useState<PracticeShot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchShots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('practice_shots')
      .select('*')
      .order('timestamp', { ascending: false });
    if (!error && data) setShots(data as PracticeShot[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShots(); }, [fetchShots]);
  return { shots, loading, refetch: fetchShots };
}

// ============================================================
// Scoring settings (localStorage)
// ============================================================

const SETTINGS_KEY = 'practice_scoring_settings';

export function useScoringSettings() {
  const [settings, setSettingsState] = useState<ScoringSettings>(DEFAULT_SCORING);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) setSettingsState(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const setSettings = (next: ScoringSettings) => {
    setSettingsState(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const resetSettings = () => {
    setSettingsState(DEFAULT_SCORING);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return { settings, setSettings, resetSettings };
}
