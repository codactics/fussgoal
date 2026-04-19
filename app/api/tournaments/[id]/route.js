import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../../lib/adminAuth";
import {
  canAdminAccessTournament,
  isMasterAdminSession,
  sanitizeAdmin,
} from "../../../../lib/adminAccess";
import {
  deleteTournamentAdminAccounts,
  ensureTournamentAdminAccountsAvailable,
  sanitizeTournamentAdmins,
  syncTournamentAdminAccounts,
  validateTournamentAdmins,
} from "../../../../lib/tournamentAdminAccounts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTournamentName(name) {
  return String(name || "").trim().toLowerCase();
}

function withNoStore(response) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
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
    return withNoStore(NextResponse.json({ tournament: record }));
  } catch {
    return withNoStore(NextResponse.json(
      { message: "Unable to load the tournament right now." },
      { status: 500 }
    ));
  }
}

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return withNoStore(NextResponse.json({ message: "Unauthorized." }, { status: 401 }));
    }

    const { id } = await params;
    const tournament = await request.json();
    const { _id: _clientId, ...incomingTournament } = tournament || {};
    const name = String(incomingTournament?.name || "").trim();
    const normalizedName = normalizeTournamentName(name);

    if (!name) {
      return withNoStore(
        NextResponse.json({ message: "Tournament name is required." }, { status: 400 })
      );
    }

    const db = await getDb();
    const collection = db.collection("tournaments");
    const existingTournament = await collection.findOne({
      normalizedName,
      id: { $ne: id },
    });

    if (existingTournament) {
      return withNoStore(NextResponse.json(
        { message: "Tournament already exists." },
        { status: 409 }
      ));
    }

    const currentTournament = await collection.findOne({ id });

    if (!currentTournament) {
      return withNoStore(NextResponse.json({ message: "Tournament not found." }, { status: 404 }));
    }

    if (!canAdminAccessTournament(session, currentTournament)) {
      return withNoStore(NextResponse.json({ message: "Unauthorized." }, { status: 403 }));
    }

    const requestedTournamentAdmins = isMasterAdminSession(session)
      ? incomingTournament?.tournamentAdmins
      : currentTournament?.tournamentAdmins || [];
    const tournamentAdminError = validateTournamentAdmins(requestedTournamentAdmins);

    if (tournamentAdminError) {
      return withNoStore(NextResponse.json({ message: tournamentAdminError }, { status: 400 }));
    }

    const sessionAdmin = sanitizeAdmin(session);
    const sanitizedTournamentAdmins = sanitizeTournamentAdmins(requestedTournamentAdmins);
    await ensureTournamentAdminAccountsAvailable(
      db,
      id,
      sanitizedTournamentAdmins,
      currentTournament.tournamentAdmins || []
    );

    const nextTournament = {
      ...currentTournament,
      ...incomingTournament,
      id,
      name,
      normalizedName,
      ownerUsername: currentTournament.ownerUsername || sessionAdmin.username,
      ownerRole: currentTournament.ownerRole || sessionAdmin.role,
      tournamentAdmins: sanitizedTournamentAdmins,
      createdAt: currentTournament.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.replaceOne({ id }, nextTournament);
    await syncTournamentAdminAccounts(
      db,
      id,
      sanitizedTournamentAdmins,
      currentTournament.tournamentAdmins || []
    );
    const { _id, ...record } = nextTournament;
    return withNoStore(NextResponse.json({ tournament: record }));
  } catch (error) {
    return withNoStore(NextResponse.json(
      { message: error?.message || "Unable to update the tournament right now." },
      { status: 500 }
    ));
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return withNoStore(NextResponse.json({ message: "Unauthorized." }, { status: 401 }));
    }

    const { id } = await params;
    const payload = await request.json();
    const fixtureKey = String(payload?.fixtureKey || "").trim();
    const snapshot = payload?.snapshot;

    if (!fixtureKey || !snapshot || typeof snapshot !== "object") {
      return withNoStore(NextResponse.json(
        { message: "Fixture key and snapshot are required." },
        { status: 400 }
      ));
    }

    const db = await getDb();
    const collection = db.collection("tournaments");
    const currentTournament = await collection.findOne({ id });

    if (!currentTournament) {
      return withNoStore(NextResponse.json({ message: "Tournament not found." }, { status: 404 }));
    }

    if (!canAdminAccessTournament(session, currentTournament)) {
      return withNoStore(NextResponse.json({ message: "Unauthorized." }, { status: 403 }));
    }

    const updatedAt = new Date().toISOString();
    await collection.updateOne(
      { id },
      {
        $set: {
          [`data.matchStatuses.${fixtureKey}`]: snapshot,
          updatedAt,
        },
      }
    );

    const updatedTournament = await collection.findOne({ id });

    if (!updatedTournament) {
      return withNoStore(NextResponse.json(
        { message: "Unable to load the updated tournament." },
        { status: 500 }
      ));
    }

    const { _id, ...record } = updatedTournament;
    return withNoStore(NextResponse.json({ tournament: record }));
  } catch (error) {
    return withNoStore(NextResponse.json(
      { message: error?.message || "Unable to update the live match status right now." },
      { status: 500 }
    ));
  }
}

export async function DELETE(_request, { params }) {
  try {
    const cookieStore = await cookies();
    const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!session) {
      return withNoStore(NextResponse.json({ message: "Unauthorized." }, { status: 401 }));
    }

    if (!isMasterAdminSession(session)) {
      return withNoStore(NextResponse.json(
        { message: "Only the master admin can delete tournaments." },
        { status: 403 }
      ));
    }

    const { id } = await params;
    const db = await getDb();
    const tournament = await db.collection("tournaments").findOne({ id });

    if (!tournament) {
      return withNoStore(NextResponse.json({ message: "Tournament not found." }, { status: 404 }));
    }

    const result = await db.collection("tournaments").deleteOne({ id });

    if (!result.deletedCount) {
      return withNoStore(NextResponse.json({ message: "Tournament not found." }, { status: 404 }));
    }

    await deleteTournamentAdminAccounts(db, id, tournament.tournamentAdmins || []);

    return withNoStore(NextResponse.json({ success: true }));
  } catch (error) {
    return withNoStore(NextResponse.json(
      { message: error?.message || "Unable to delete the tournament right now." },
      { status: 500 }
    ));
  }
}
