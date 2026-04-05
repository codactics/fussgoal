import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "../../../../lib/adminAuth";

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
    const admin = await db.collection("admin_access").findOne({
      username,
      password,
    });

    if (!admin) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      username: admin.username,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(admin.username),
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
