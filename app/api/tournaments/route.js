import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../lib/adminAuth";
import {
  buildTournamentAdminFilter,
  isMasterAdminSession,
  sanitizeAdmin,
} from "../../../lib/adminAccess";
import {
  ensureTournamentAdminAccountsAvailable,
  sanitizeTournamentAdmins,
  syncTournamentAdminAccounts,
  validateTournamentAdmins,
} from "../../../lib/tournamentAdminAccounts";

function normalizeTournamentName(name) {
  return String(name || "").trim().toLowerCase();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const launchedOnly = searchParams.get("launchedOnly") === "true";
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!launchedOnly && !session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    const adminFilter = launchedOnly ? { launched: true } : buildTournamentAdminFilter(session);
    const tournaments = await db
      .collection("tournaments")
      .find(adminFilter)
      .sort({ savedAt: -1, updatedAt: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      tournaments: tournaments.map(({ _id, ...tournament }) => tournament),
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to load tournaments right now." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const tournament = await request.json();
    const name = String(tournament?.name || "").trim();
    const normalizedName = normalizeTournamentName(name);
    const requestedTournamentAdmins = isMasterAdminSession(session)
      ? tournament?.tournamentAdmins
      : [];
    const tournamentAdminError = validateTournamentAdmins(requestedTournamentAdmins);

    if (!name) {
      return NextResponse.json({ message: "Tournament name is required." }, { status: 400 });
    }

    if (tournamentAdminError) {
      return NextResponse.json({ message: tournamentAdminError }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("tournaments");
    const sessionAdmin = sanitizeAdmin(session);
    const existingTournament = await collection.findOne({ normalizedName });

    if (existingTournament) {
      return NextResponse.json(
        { message: "Tournament already exists." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const sanitizedTournamentAdmins = sanitizeTournamentAdmins(requestedTournamentAdmins);
    await ensureTournamentAdminAccountsAvailable(
      db,
      tournament.id,
      sanitizedTournamentAdmins,
      []
    );
    const nextTournament = {
      ...tournament,
      name,
      normalizedName,
      ownerUsername: tournament?.ownerUsername || sessionAdmin.username,
      ownerRole: sessionAdmin.role,
      tournamentAdmins: sanitizedTournamentAdmins,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(nextTournament);
    await syncTournamentAdminAccounts(
      db,
      nextTournament.id,
      sanitizedTournamentAdmins,
      []
    );

    return NextResponse.json({ tournament: nextTournament }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error?.message || "Unable to save tournament right now." },
      { status: 500 }
    );
  }
}
