import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ profile: null });
    }

    // Session value is profile JSON
    try {
      const profile = JSON.parse(sessionCookie.value);
      return NextResponse.json({ profile });
    } catch {
      return NextResponse.json({ profile: null });
    }
  } catch {
    return NextResponse.json({ profile: null });
  }
}