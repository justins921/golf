'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';
import { useSessions, useShotCounts } from '@/lib/hooks';
import { createClient } from '@/lib/supabase';
import { parseGarminCsv, assignIds } from '@/lib/parseGarminCsv';
import { v4 as uuidv4 } from 'uuid';

export default function ShotDataPage() {
  return (
    <AuthGuard>
      <Nav />
      <ShotDashboard />
    </AuthGuard>
  );
}

function ShotDashboard() {
  const { user } = useAuth();
  const { sessions, loading, refetch } = useSessions();
  const { counts } = useShotCounts(sessions);
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const supabase = createClient();

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !user) return;

      setUploading(true);
      setUploadError(null);
      setUploadStatus(null);

      try {
        for (const file of Array.from(files)) {
          setUploadStatus(`Processing ${file.name}...`);
          const text = await file.text();
          const result = parseGarminCsv(text);

          if (result.shots.length === 0) {
            setUploadError(`No valid shots found in ${file.name}`);
            continue;
          }

          const sessionId = uuidv4();
          const sessionName = file.name.replace(/\.csv$/i, '');
          const playedAt = result.dateRange.earliest;

          const { error: sessErr } = await supabase.from('sessions').insert({
            id: sessionId,
            user_id: user.id,
            name: sessionName,
            played_at: playedAt,
            notes: result.errors.length > 0 ? `Parse warnings: ${result.errors.join('; ')}` : null,
          });

          if (sessErr) {
            setUploadError(`Failed to create session: ${sessErr.message}`);
            continue;
          }

          const shotsWithIds = assignIds(result.shots, sessionId);
          const batchSize = 100;
          for (let i = 0; i < shotsWithIds.length; i += batchSize) {
            const batch = shotsWithIds.slice(i, i + batchSize);
            const { error: shotErr } = await supabase.from('shots').insert(batch);
            if (shotErr) {
              setUploadError(`Failed to insert shots: ${shotErr.message}`);
              break;
            }
          }

          setUploadStatus(
            `Imported ${result.shots.length} shots from ${result.clubs.length} clubs (${file.name})`
          );
        }

        await refetch();
      } catch (err) {
        setUploadError(`Upload failed: ${(err as Error).message}`);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [user, supabase, refetch]
  );

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this session and all its shots?')) return;
    await supabase.from('shots').delete().eq('session_id', sessionId);
    await supabase.from('sessions').delete().eq('id', sessionId);
    await refetch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-4">Shot Data</h1>

        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-gray-200 mb-2">Import Sessions</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload Garmin Approach R50 &quot;DrivingRange-*.csv&quot; exports. You can select multiple files.
          </p>

          <label className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-[15px] font-medium rounded-xl cursor-pointer transition-colors active:scale-[0.98]">
            {uploading ? 'Uploading...' : 'Choose CSV Files'}
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {uploadStatus && (
            <p className="mt-3 text-sm text-green-400">{uploadStatus}</p>
          )}
          {uploadError && (
            <p className="mt-3 text-sm text-red-400">{uploadError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => router.push('/compare')}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-full text-sm text-gray-300 transition-colors"
        >
          Compare Sessions
        </button>
        <button
          onClick={() => router.push('/yardage')}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-full text-sm text-gray-300 transition-colors"
        >
          Yardage Card
        </button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-200 mb-3">Sessions</h2>
        {loading ? (
          <div className="text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-[13px] bg-gray-900 rounded-2xl">
            No sessions yet. Upload a CSV to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-800/70 transition-colors cursor-pointer"
                onClick={() => router.push(`/session/${session.id}`)}
              >
                <div>
                  <h3 className="text-gray-200 font-medium">{session.name}</h3>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    {session.played_at && (
                      <span>{new Date(session.played_at).toLocaleDateString()}</span>
                    )}
                    {counts[session.id] && (
                      <>
                        <span>{counts[session.id].total} shots</span>
                        <span>{counts[session.id].clubs} clubs</span>
                      </>
                    )}
                    {session.location_text && <span>{session.location_text}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(session.id);
                    }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
