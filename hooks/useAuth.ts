import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api'; // Pastikan path ini benar

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Saat halaman di-refresh, ambil metadata user dari localStorage (TIDAK BERISI TOKEN)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user_meta');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const logout = async () => {
    try {
      // 1. Minta backend menghancurkan HttpOnly Cookie
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      // 2. Bersihkan jejak di browser
      localStorage.removeItem('user_meta');
      setUser(null);
      
      // 3. Tendang kembali ke halaman login
      router.push('/login');
    }
  };

  return { user, logout };
};