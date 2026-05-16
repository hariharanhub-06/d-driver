import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

  // Extract subdomain
  let slug = '';
  if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    slug = hostname.replace(`.${baseDomain}`, '');
  }

  const response = NextResponse.next();

  if (slug && slug !== 'www') {
    response.cookies.set('school-slug', slug, { path: '/', maxAge: 3600 });
    response.headers.set('x-school-slug', slug);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
