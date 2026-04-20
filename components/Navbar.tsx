'use client';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6">
      <div className="text-slate-100 font-bold tracking-wider">
        PTT ADMIN CONSOLE
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-slate-400">
            System Admin: {user.username || user.id}
          </span>
        )}
        <button 
          onClick={logout}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
        >
          LOGOUT
        </button>
      </div>
    </header>
  );
}