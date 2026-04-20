'use client';
import { usePathname } from 'next/navigation';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import './globals.css'; // Assuming Tailwind setup is here

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 min-h-screen font-sans">
        {isLoginPage ? (
          children
        ) : (
          <div className="flex flex-col h-screen overflow-hidden">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}