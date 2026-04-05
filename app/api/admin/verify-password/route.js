import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const password = String(body?.password || "");

    if (!password) {
      return NextResponse.json({ message: "Password is required." }, { status: 400 });
    }

    const db = await getDb();
    const admin = await db.collection("admin_access").findOne({
      username: session.username,
      password,
    });

    if (!admin) {
      return NextResponse.json({ message: "Invalid admin password." }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Unable to verify the admin password right now." },
      { status: 500 }
    );
  }
}
