import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth/* (better-auth routes)
     * - /login (login page itself)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /public files
     */
    "/((?!api/auth|api/webhook|api/cron|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
