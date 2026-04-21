'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // FIX 1: Tambahkan state untuk mengunci form saat request berjalan
  const [isLoading, setIsLoading] = useState(false); 
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Bersihkan error sebelumnya
    setIsLoading(true); // Kunci form

    try {
      // FIX 2: Request login. Token akan otomatis ditanam ke HttpOnly Cookie oleh backend.
      const res = await api.post('/auth/login', { username, password });
      
      // FIX 3: Simpan profil user (TANPA TOKEN) ke localStorage untuk dipakai Navbar
      if (res.data.user) {
        localStorage.setItem('user_meta', JSON.stringify(res.data.user));
      }
      
      // FIX 4: Gunakan router.push dari Next.js agar transisi instan, bukan window.location.href
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false); // Buka kembali kunci form jika gagal
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
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              disabled={isLoading} // Kunci input saat loading
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Passcode</label>
            <input 
              type="password" 
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={isLoading} // Kunci input saat loading
            />
          </div>
          
          {/* FIX 5: Update visual tombol saat loading */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors text-sm tracking-wide mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                {/* Animasi Spinner SVG bawaan Tailwind */}
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AUTHENTICATING...
              </>
            ) : (
              'INITIALIZE CONNECTION'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}