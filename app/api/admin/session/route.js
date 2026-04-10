import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import { isMasterAdminSession } from "../../../../lib/adminAccess";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username || null,
    role: session?.role || null,
    isMasterAdmin: isMasterAdminSession(session),
  });
}
