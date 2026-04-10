import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "../../../../lib/adminAuth";
import {
  MAIN_ADMIN_COLLECTION,
  TOURNAMENT_ADMIN_COLLECTION,
  sanitizeAdmin,
} from "../../../../lib/adminAccess";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    let admin = await db.collection(MAIN_ADMIN_COLLECTION).findOne({
      username,
      password,
    });

    if (!admin) {
      admin = await db.collection(TOURNAMENT_ADMIN_COLLECTION).findOne({
        username,
        password,
      });
    }

    if (!admin) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const sessionAdmin = sanitizeAdmin(admin);

    const response = NextResponse.json({
      success: true,
      username: sessionAdmin.username,
      role: sessionAdmin.role,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(sessionAdmin),
      getAdminSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { message: "Unable to process admin login right now." },
      { status: 500 }
    );
  }
}
