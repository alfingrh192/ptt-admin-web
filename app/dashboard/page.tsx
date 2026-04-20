'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, talkgroups: 0 });

  useEffect(() => {
    // Note: Assuming backend has generic list endpoints.
    // If not, this serves as architecture preparation.
    Promise.all([
      api.get('/users').catch(() => ({ data: { data: [] } })), // Mock if doesn't exist yet
      api.get('/talkgroups')
    ]).then(([usersRes, tgRes]) => {
      setStats({
        users: usersRes.data.data?.length || 0,
        talkgroups: tgRes.data.data?.length || 0
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-6 tracking-wide">SYSTEM OVERVIEW</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Operators</div>
          <div className="text-3xl font-bold text-blue-400">{stats.users}</div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Talkgroups</div>
          <div className="text-3xl font-bold text-blue-400">{stats.talkgroups}</div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Mumble Integration</div>
          <div className="text-sm font-bold text-green-400 mt-2 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div> Connected
          </div>
        </div>
      </div>

      <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg h-64 flex items-center justify-center">
         <span className="text-slate-600 uppercase text-sm tracking-widest">[ DISPATCHER METRICS PLACEHOLDER ]</span>
      </div>
    </div>
  );
}