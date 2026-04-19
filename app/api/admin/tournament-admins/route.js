import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import {
  isMasterAdminSession,
  TOURNAMENT_ADMIN_COLLECTION,
} from "../../../../lib/adminAccess";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session || !isMasterAdminSession(session)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    const admins = await db
      .collection(TOURNAMENT_ADMIN_COLLECTION)
      .find({})
      .sort({ username: 1 })
      .toArray();

    return NextResponse.json({
      admins: admins.map(({ _id, username, password }) => ({
        username,
        password,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error?.message || "Unable to load tournament admins right now." },
      { status: 500 }
    );
  }
}
