import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/mongodb";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../lib/adminAuth";

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
    const tournaments = await db
      .collection("tournaments")
      .find(launchedOnly ? { launched: true } : {})
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

    if (!name) {
      return NextResponse.json({ message: "Tournament name is required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("tournaments");
    const existingTournament = await collection.findOne({ normalizedName });

    if (existingTournament) {
      return NextResponse.json(
        { message: "Tournament already exists." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const nextTournament = {
      ...tournament,
      name,
      normalizedName,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(nextTournament);

    return NextResponse.json({ tournament: nextTournament }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Unable to save tournament right now." },
      { status: 500 }
    );
  }
}
