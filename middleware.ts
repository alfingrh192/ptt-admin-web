import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Perhatikan penambahan 'async' pada fungsi middleware
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  // 1. Jika tidak ada token dan bukan di halaman login, tendang ke login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Jika ada token, verifikasi keasliannya secara kriptografis
  if (token) {
    try {
      // FIX: Ambil rahasia dari environment variables.
      // Pastikan ada JWT_SECRET di file .env.local Anda yang nilainya SAMA PERSIS dengan backend!
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      
      // FIX: jwtVerify akan melempar error (masuk ke catch) jika token dipalsukan atau kadaluarsa
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.role !== 'admin' && !isLoginPage) {
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('token');
        return res;
      }
      
      if (isLoginPage && payload.role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (e) {
      // Menangkap: Token kadaluarsa, signature salah, atau token rusak
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete('token');
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};