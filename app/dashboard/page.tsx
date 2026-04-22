'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, talkgroups: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // STATE UNTUK PROSES SYNC MANUAL
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchDashboardData = () => {
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
      
      if (usersResult.status === 'rejected' && tgResult.status === 'rejected') {
        setFetchError('CONTROL PLANE BACKEND UNREACHABLE.');
      }
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // FUNGSI TRIGGER SYNC MANUAL
  const handleForceSync = async () => {
    const confirmSync = window.confirm(
      "PERINGATAN: Proses ini akan memaksa sinkronisasi status antara Web DB dan Murmur Engine. Pastikan tidak ada aktivitas alokasi (Create TG/User) yang sedang berjalan saat ini. Lanjutkan?"
    );
    
    if (!confirmSync) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      // Panggil endpoint baru yang sudah dibuat di backend
      const response = await api.post('/system/sync-murmur');
      const { tgSynced, userSynced } = response.data.data;
      setSyncMessage({ 
        type: 'success', 
        text: `Sync berhasil! Recovered: ${tgSynced} Talkgroups & ${userSynced} Users.` 
      });
      // Refresh angka di dashboard
      fetchDashboardData();
    } catch (error: any) {
      setSyncMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Gagal melakukan sinkronisasi dengan server Murmur.' 
      });
    } finally {
      setIsSyncing(false);
      // Hilangkan pesan setelah 5 detik
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-6 tracking-wide">SYSTEM OVERVIEW</h1>
      
      {fetchError && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-400 font-bold tracking-widest text-sm flex items-center gap-3 shadow-lg shadow-red-900/20">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-900 text-white">!</span>
          [ WARNING ] {fetchError}
        </div>
      )}

      {/* Banner Pesan Hasil Sync */}
      {syncMessage && (
        <div className={`mb-6 p-4 border rounded-lg text-sm font-bold tracking-wider flex items-center gap-3 shadow-lg ${
          syncMessage.type === 'success' 
            ? 'bg-green-950 border-green-800 text-green-400 shadow-green-900/20' 
            : 'bg-red-950 border-red-800 text-red-400 shadow-red-900/20'
        }`}>
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white ${syncMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {syncMessage.type === 'success' ? '✓' : '!'}
          </span>
          {syncMessage.text}
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
        
        {/* Card Mumble Integration (Dilengkapi Tombol Sync) */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col justify-between">
          <div>
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
          
          {/* TOMBOL FORCE SYNC */}
          <button
            onClick={handleForceSync}
            disabled={isSyncing || !!fetchError}
            className={`mt-4 w-full py-2 px-3 text-xs font-bold rounded transition-colors border ${
              isSyncing || fetchError
                ? 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed'
                : 'bg-amber-900/30 text-amber-500 border-amber-700/50 hover:bg-amber-900/50 hover:text-amber-400'
            }`}
          >
            {isSyncing ? 'SYNCING ENGINE...' : 'FORCE RECONCILE MURMUR'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg h-64 flex items-center justify-center">
         <span className="text-slate-600 uppercase text-sm tracking-widest">[ DISPATCHER METRICS PLACEHOLDER ]</span>
      </div>
    </div>
  );
}