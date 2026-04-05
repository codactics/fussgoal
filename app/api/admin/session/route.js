import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username || null,
  });
}

