'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, talkgroups: 0 });
  
  // FIX 1: Tambahkan state untuk Loading dan Error
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    
    Promise.allSettled([
      api.get('/users'),
      api.get('/talkgroups')
    ]).then(([usersResult, tgResult]) => {
      setStats({
        users: usersResult.status === 'fulfilled'
          ? usersResult.value.data.data?.length || 0
          : 0,
        talkgroups: tgResult.status === 'fulfilled'
          ? tgResult.value.data.data?.length || 0
          : 0
      });
      
      // Hanya error jika KEDUANYA gagal
      if (usersResult.status === 'rejected' && tgResult.status === 'rejected') {
        setFetchError('CONTROL PLANE BACKEND UNREACHABLE.');
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-6 tracking-wide">SYSTEM OVERVIEW</h1>
      
      {/* FIX 3: Banner Error Merah Tebal jika Server Mati */}
      {fetchError && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-400 font-bold tracking-widest text-sm flex items-center gap-3 shadow-lg shadow-red-900/20">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-900 text-white">!</span>
          [ WARNING ] {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Total Operators */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Operators</div>
          <div className="text-3xl font-bold text-blue-400">
            {isLoading ? <span className="animate-pulse text-slate-600">...</span> : stats.users}
          </div>
        </div>
        
        {/* Card Active Talkgroups */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Talkgroups</div>
          <div className="text-3xl font-bold text-blue-400">
            {isLoading ? <span className="animate-pulse text-slate-600">...</span> : stats.talkgroups}
          </div>
        </div>
        
        {/* Card Mumble Integration */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Mumble Integration</div>
          {isLoading ? (
             <div className="h-5 w-20 bg-slate-700 rounded animate-pulse mt-2"></div>
          ) : fetchError ? (
             <div className="text-sm font-bold text-red-400 mt-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500"></div> Disconnected
             </div>
          ) : (
             <div className="text-sm font-bold text-green-400 mt-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div> Connected
             </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg h-64 flex items-center justify-center">
         <span className="text-slate-600 uppercase text-sm tracking-widest">[ DISPATCHER METRICS PLACEHOLDER ]</span>
      </div>
    </div>
  );
}