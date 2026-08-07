import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes - only SUPER_ADMIN
    if (path.startsWith('/dashboard/empresas') && token?.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Auditor routes - read-only for certain pages
    if (path.startsWith('/dashboard/reportes') && token?.role === 'AUDITOR') {
      // Allow access
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes
        if (path === '/login' || path === '/register' || path === '/' || path === '/api/register' || path.startsWith('/api/auth')) {
          return true;
        }

        // Protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
    '/register',
  ],
};