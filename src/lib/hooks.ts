'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabase';
import type { Session, Shot, ShotFilter, Putter, PutterTest, BagClub, WedgeMatrix, SwingSystem, SpeedSession, SpeedReading, WorkoutLog, Round, RoundHole } from './types';
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

// ============================================================
// Bag club hooks
// ============================================================

export function useBagClubs() {
  const [clubs, setClubs] = useState<BagClub[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bag_clubs')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setClubs(data as BagClub[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  const upsertClub = async (club: Partial<BagClub> & { club_name: string }) => {
    if (club.id) {
      const { error } = await supabase.from('bag_clubs').update(club).eq('id', club.id);
      if (!error) await fetchClubs();
      return error;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Error('Not authenticated');
    const { error } = await supabase.from('bag_clubs').insert({ ...club, user_id: user.id });
    if (!error) await fetchClubs();
    return error;
  };

  const deleteClub = async (id: string) => {
    const { error } = await supabase.from('bag_clubs').delete().eq('id', id);
    if (!error) await fetchClubs();
    return error;
  };

  return { clubs, loading, refetch: fetchClubs, upsertClub, deleteClub };
}

// ============================================================
// Wedge matrix hooks
// ============================================================

export function useWedgeMatrix() {
  const [matrix, setMatrix] = useState<WedgeMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wedge_matrix')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (!error && data) setMatrix(data as WedgeMatrix);
    else setMatrix(null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const saveMatrix = async (updates: {
    swing_system: SwingSystem;
    swing_labels: string[];
    wedge_clubs: string[];
    distances: Record<string, number>;
    notes?: string | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Error('Not authenticated');

    if (matrix?.id) {
      const { error } = await supabase
        .from('wedge_matrix')
        .update(updates)
        .eq('id', matrix.id);
      if (!error) await fetchMatrix();
      return error;
    }
    const { error } = await supabase
      .from('wedge_matrix')
      .insert({ ...updates, user_id: user.id });
    if (!error) await fetchMatrix();
    return error;
  };

  return { matrix, loading, refetch: fetchMatrix, saveMatrix };
}

// ============================================================
// Speed training hooks
// ============================================================

export function useSpeedSessions() {
  const [sessions, setSessions] = useState<SpeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('speed_sessions')
      .select('*')
      .order('session_date', { ascending: false });
    if (!error && data) setSessions(data as SpeedSession[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const addSession = async (session: Omit<SpeedSession, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated'), data: null };
    const { data, error } = await supabase
      .from('speed_sessions')
      .insert({ ...session, user_id: user.id })
      .select()
      .single();
    if (!error) await fetchSessions();
    return { data: data as SpeedSession | null, error };
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('speed_sessions').delete().eq('id', id);
    if (!error) await fetchSessions();
    return error;
  };

  return { sessions, loading, refetch: fetchSessions, addSession, deleteSession };
}

export function useSpeedReadings(sessionId: string | null) {
  const [readings, setReadings] = useState<SpeedReading[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchReadings = useCallback(async () => {
    if (!sessionId) { setReadings([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('speed_readings')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true })
      .order('rep_number', { ascending: true });
    if (!error && data) setReadings(data as SpeedReading[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const addReading = async (reading: Omit<SpeedReading, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('speed_readings').insert(reading);
    if (!error) await fetchReadings();
    return error;
  };

  const deleteReading = async (id: string) => {
    const { error } = await supabase.from('speed_readings').delete().eq('id', id);
    if (!error) await fetchReadings();
    return error;
  };

  return { readings, loading, refetch: fetchReadings, addReading, deleteReading };
}

export function useAllSpeedReadings() {
  const [readings, setReadings] = useState<(SpeedReading & { session_date: string; protocol: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('speed_readings')
      .select('*, speed_sessions!inner(session_date, protocol)')
      .order('created_at', { ascending: true });
    if (!error && data) {
      const mapped = data.map((r: Record<string, unknown>) => {
        const ss = r.speed_sessions as Record<string, unknown>;
        return {
          ...r,
          session_date: ss.session_date as string,
          protocol: ss.protocol as string,
          speed_sessions: undefined,
        };
      });
      setReadings(mapped as (SpeedReading & { session_date: string; protocol: string })[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  return { readings, loading, refetch: fetchReadings };
}

// ============================================================
// Fitness / workout hooks
// ============================================================

export function useWorkoutLogs() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .order('workout_date', { ascending: false });
    if (!error && data) setLogs(data as WorkoutLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const addLog = async (log: Omit<WorkoutLog, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Error('Not authenticated');
    const { error } = await supabase.from('workout_logs').insert({ ...log, user_id: user.id });
    if (!error) await fetchLogs();
    return error;
  };

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('workout_logs').delete().eq('id', id);
    if (!error) await fetchLogs();
    return error;
  };

  return { logs, loading, refetch: fetchLogs, addLog, deleteLog };
}

// ============================================================
// Round tracking hooks
// ============================================================

export function useRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .order('round_date', { ascending: false });
    if (!error && data) setRounds(data as Round[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const addRound = async (round: Omit<Round, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated'), data: null };
    const { data, error } = await supabase
      .from('rounds')
      .insert({ ...round, user_id: user.id })
      .select()
      .single();
    if (!error) await fetchRounds();
    return { data: data as Round | null, error };
  };

  const updateRound = async (id: string, updates: Partial<Round>) => {
    const { error } = await supabase.from('rounds').update(updates).eq('id', id);
    if (!error) await fetchRounds();
    return error;
  };

  const deleteRound = async (id: string) => {
    const { error } = await supabase.from('rounds').delete().eq('id', id);
    if (!error) await fetchRounds();
    return error;
  };

  return { rounds, loading, refetch: fetchRounds, addRound, updateRound, deleteRound };
}

export function useRoundHoles(roundId: string | null) {
  const [holes, setHoles] = useState<RoundHole[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchHoles = useCallback(async () => {
    if (!roundId) { setHoles([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('round_holes')
      .select('*')
      .eq('round_id', roundId)
      .order('hole_number', { ascending: true });
    if (!error && data) setHoles(data as RoundHole[]);
    setLoading(false);
  }, [roundId]);

  useEffect(() => { fetchHoles(); }, [fetchHoles]);

  const upsertHoles = async (roundId: string, holeData: Omit<RoundHole, 'id' | 'created_at'>[]) => {
    // Delete existing then insert fresh
    await supabase.from('round_holes').delete().eq('round_id', roundId);
    const { error } = await supabase.from('round_holes').insert(holeData);
    if (!error) await fetchHoles();
    return error;
  };

  return { holes, loading, refetch: fetchHoles, upsertHoles };
}
