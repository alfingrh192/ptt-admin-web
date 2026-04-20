import { useState, useEffect } from 'react';
import { getToken, decodeToken, removeToken } from '../lib/auth';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
      setUser(decoded);
    }
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
    router.push('/login');
  };

  return { user, logout };
};