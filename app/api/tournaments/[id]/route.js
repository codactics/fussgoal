import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import {
  canAdminAccessTournament,
  isMasterAdminSession,
  sanitizeAdmin,
} from "../../../../lib/adminAccess";

function normalizeTournamentName(name) {
  return String(name || "").trim().toLowerCase();
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const tournament = await db.collection("tournaments").findOne({ id });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!tournament.launched && !session) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    if (session && !canAdminAccessTournament(session, tournament)) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    const { _id, ...record } = tournament;
    return NextResponse.json({ tournament: record });
  } catch {
    return NextResponse.json(
      { message: "Unable to load the tournament right now." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const tournament = await request.json();
    const { _id: _clientId, ...incomingTournament } = tournament || {};
    const name = String(incomingTournament?.name || "").trim();
    const normalizedName = normalizeTournamentName(name);

    if (!name) {
      return NextResponse.json({ message: "Tournament name is required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("tournaments");
    const existingTournament = await collection.findOne({
      normalizedName,
      id: { $ne: id },
    });

    if (existingTournament) {
      return NextResponse.json(
        { message: "Tournament already exists." },
        { status: 409 }
      );
    }

    const currentTournament = await collection.findOne({ id });

    if (!currentTournament) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    if (!canAdminAccessTournament(session, currentTournament)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    const sessionAdmin = sanitizeAdmin(session);

    const nextTournament = {
      ...currentTournament,
      ...incomingTournament,
      id,
      name,
      normalizedName,
      ownerUsername: currentTournament.ownerUsername || sessionAdmin.username,
      ownerRole: currentTournament.ownerRole || sessionAdmin.role,
      createdAt: currentTournament.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.replaceOne({ id }, nextTournament);
    const { _id, ...record } = nextTournament;
    return NextResponse.json({ tournament: record });
  } catch {
    return NextResponse.json(
      { message: "Unable to update the tournament right now." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (!isMasterAdminSession(session)) {
      return NextResponse.json(
        { message: "Only the master admin can delete tournaments." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = await getDb();
    const result = await db.collection("tournaments").deleteOne({ id });

    if (!result.deletedCount) {
      return NextResponse.json({ message: "Tournament not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Unable to delete the tournament right now." },
      { status: 500 }
    );
  }
}
