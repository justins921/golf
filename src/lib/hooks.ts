'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabase';
import type { Session, Shot, ShotFilter, Putter, PutterTest } from './types';
import { filterShots } from './stats';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('played_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      setSessions(data as Session[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, refetch: fetchSessions };
}

export function useSessionShots(sessionId: string | null) {
  const [shots, setShots] = useState<Shot[]>([]);
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
      .from('shots')
      .select('*')
      .eq('session_id', sessionId)
      .order('datetime', { ascending: true });

    if (!error && data) {
      setShots(data as Shot[]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchShots();
  }, [fetchShots]);

  return { shots, loading, refetch: fetchShots };
}

export function useMultiSessionShots(sessionIds: string[]) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchShots = useCallback(async () => {
    if (sessionIds.length === 0) {
      setShots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .in('session_id', sessionIds)
      .order('datetime', { ascending: true });

    if (!error && data) {
      setShots(data as Shot[]);
    }
    setLoading(false);
  }, [sessionIds.join(',')]);

  useEffect(() => {
    fetchShots();
  }, [fetchShots]);

  return { shots, loading, refetch: fetchShots };
}

export function useAllShots() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchShots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .order('datetime', { ascending: true });

    if (!error && data) {
      setShots(data as Shot[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShots();
  }, [fetchShots]);

  return { shots, loading, refetch: fetchShots };
}

export function useFilteredShots(shots: Shot[], filter: ShotFilter) {
  return filterShots(shots, filter);
}

export function useShotCounts(sessions: Session[]) {
  const [counts, setCounts] = useState<Record<string, { total: number; clubs: number }>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (sessions.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);
      const ids = sessions.map((s) => s.id);
      const { data, error } = await supabase
        .from('shots')
        .select('session_id, club_name')
        .in('session_id', ids);

      if (!error && data) {
        const map: Record<string, { total: number; clubSet: Set<string> }> = {};
        for (const row of data) {
          if (!map[row.session_id]) {
            map[row.session_id] = { total: 0, clubSet: new Set() };
          }
          map[row.session_id].total++;
          map[row.session_id].clubSet.add(row.club_name);
        }
        const result: Record<string, { total: number; clubs: number }> = {};
        for (const [id, val] of Object.entries(map)) {
          result[id] = { total: val.total, clubs: val.clubSet.size };
        }
        setCounts(result);
      }
      setLoading(false);
    };

    fetchCounts();
  }, [sessions]);

  return { counts, loading };
}

// ============================================================
// Putter hooks
// ============================================================

export function usePutters() {
  const [putters, setPutters] = useState<Putter[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPutters = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('putters')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setPutters(data as Putter[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPutters(); }, [fetchPutters]);

  const upsertPutter = async (putter: Partial<Putter> & { name: string }) => {
    if (putter.id) {
      const { error } = await supabase.from('putters').update(putter).eq('id', putter.id);
      if (!error) await fetchPutters();
      return error;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Error('Not authenticated');
    const { error } = await supabase.from('putters').insert({ ...putter, user_id: user.id });
    if (!error) await fetchPutters();
    return error;
  };

  const deletePutter = async (id: string) => {
    const { error } = await supabase.from('putters').delete().eq('id', id);
    if (!error) await fetchPutters();
    return error;
  };

  return { putters, loading, refetch: fetchPutters, upsertPutter, deletePutter };
}

export function usePutterTests(putterIds: string[]) {
  const [tests, setTests] = useState<PutterTest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTests = useCallback(async () => {
    if (putterIds.length === 0) {
      setTests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('putter_tests')
      .select('*')
      .in('putter_id', putterIds)
      .order('test_date', { ascending: false });
    if (!error && data) setTests(data as PutterTest[]);
    setLoading(false);
  }, [putterIds.join(',')]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const addTest = async (test: Omit<PutterTest, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('putter_tests').insert(test);
    if (!error) await fetchTests();
    return error;
  };

  const deleteTest = async (id: string) => {
    const { error } = await supabase.from('putter_tests').delete().eq('id', id);
    if (!error) await fetchTests();
    return error;
  };

  return { tests, loading, refetch: fetchTests, addTest, deleteTest };
}
