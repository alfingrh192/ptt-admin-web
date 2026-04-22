import axios from 'axios';

// ✅ FIX: Hapus import getToken & removeToken — tidak relevan untuk HttpOnly cookie
// HttpOnly cookie tidak bisa dibaca oleh JavaScript (document.cookie)
// Browser mengirimnya otomatis ke backend via withCredentials: true

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, // ✅ Ini yang bikin cookie dikirim otomatis di setiap request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ FIX: Hapus request interceptor yang baca token manual
// Sebelumnya: interceptor ambil token dari document.cookie → Authorization header
// Ini tidak pernah berhasil karena HttpOnly cookie tidak bisa dibaca JS

// Handle response error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isLoginPage = window.location.pathname === '/login';
        // ✅ Guard: hanya redirect jika bukan dari halaman login
        // Mencegah loop: /login → 401 → redirect /login → 401 → ...
        if (!isLoginPage) {
          // Bersihkan user_meta dari localStorage sebelum redirect
          localStorage.removeItem('user_meta');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;