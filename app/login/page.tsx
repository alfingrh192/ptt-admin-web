'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { setToken } from '../../lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      setToken(res.data.data.token);
      window.location.href = '/dashboard'; 
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-widest text-slate-100">WAVE<span className="text-blue-500">CONTROL</span></h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">System Administrator</p>
        </div>
        
        {error && <div className="mb-4 text-xs text-red-400 bg-red-950/50 border border-red-900 p-2 rounded">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Operator ID</label>
            <input 
              type="text" 
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={username} onChange={(e) => setUsername(e.target.value)} required 
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Passcode</label>
            <input 
              type="password" 
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={password} onChange={(e) => setPassword(e.target.value)} required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors text-sm tracking-wide mt-4">
            INITIALIZE CONNECTION
          </button>
        </form>
      </div>
    </div>
  );
}