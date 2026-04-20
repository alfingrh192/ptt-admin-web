'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'User Management', path: '/users' },
    { label: 'Talkgroups', path: '/talkgroups' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-4rem)] flex flex-col">
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  className={`block px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-slate-800 text-blue-400 border-l-4 border-blue-500' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">System Status</div>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Control Plane Online
        </div>
      </div>
    </aside>
  );
}