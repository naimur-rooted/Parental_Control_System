/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, KeyRound, Mail, AlertTriangle, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, parentEmail: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.token, data.parent.email);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 font-sans selection:bg-red-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Time's Up</h1>
          <p className="text-xs text-slate-400">Secure Self-Hosted Parental Shield</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Parent Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white placeholder-slate-600 transition-all text-sm outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <span className="text-xs text-red-500 hover:underline cursor-pointer">Forgot?</span>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white placeholder-slate-600 transition-all text-sm outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-800/80 text-white font-medium rounded-xl transition-all shadow-lg shadow-red-600/10 hover:shadow-red-500/20 flex items-center justify-center gap-2 text-sm mt-6 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isSignup ? 'Create Master Account' : 'Sign In to Dashboard'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
          <p className="text-xs text-slate-500">
            {isSignup ? 'Already have an account?' : 'Need a private parents account?'}
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="text-red-500 font-medium hover:underline ml-1.5 focus:outline-none cursor-pointer"
            >
              {isSignup ? 'Sign In Instead' : 'Register Now'}
            </button>
          </p>
          <div className="mt-4 text-[10px] text-slate-600 leading-relaxed">
            Note: All credentials, device logs, rules and remote configurations are encrypted at rest and hosted locally.
          </div>
        </div>
      </div>
    </div>
  );
}
