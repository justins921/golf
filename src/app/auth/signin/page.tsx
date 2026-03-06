'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
        setLoading(false);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(`Sign in failed: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-[28px] font-bold text-center text-gray-50 tracking-tight mb-2">Golf OS</h1>
        <p className="text-center text-gray-400 text-[15px] mb-1">Sign in to your account</p>
        <p className="text-center text-gray-500 text-[11px] mb-8">A Sobojinski Solutions product</p>

        <div className="bg-gray-900 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 rounded-xl text-red-400 text-[13px] p-3">
                {error}
              </div>
            )}

            <div>
              <label className="text-[13px] font-medium text-gray-400 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 placeholder:text-gray-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-gray-400 mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[15px] text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-green-400 hover:text-green-300">
            Sign up
          </Link>
        </p>
        <p className="text-center text-xs text-gray-500 mt-2">
          <Link href="/landing" className="text-green-400 hover:text-green-300 transition-colors">
            What is Golf OS?
          </Link>
        </p>
      </div>
    </div>
  );
}
