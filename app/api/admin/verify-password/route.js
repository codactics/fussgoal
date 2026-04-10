import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import {
  MAIN_ADMIN_COLLECTION,
  MASTER_ADMIN_ROLE,
  getAdminCollectionName,
  normalizeAdminRole,
} from "../../../../lib/adminAccess";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const password = String(body?.password || "");
    const action = String(body?.action || "").trim().toLowerCase();

    if (!password) {
      return NextResponse.json({ message: "Password is required." }, { status: 400 });
    }

    const db = await getDb();
    const adminCollection = db.collection(getAdminCollectionName(session.role));
    const admin = await adminCollection.findOne({
      username: session.username,
      password,
    });

    if (action === "delete" && normalizeAdminRole(admin?.role) !== MASTER_ADMIN_ROLE) {
      const masterAdmin = await db.collection(MAIN_ADMIN_COLLECTION).findOne({ password });

      if (!masterAdmin) {
        return NextResponse.json(
          { message: "Only the master admin password can approve deletion." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: true }
      );
    }

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
