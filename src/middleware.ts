import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Custom auth: session is managed client-side via localStorage
  // Just allow all requests through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};