import {
  MAIN_ADMIN_COLLECTION,
  TOURNAMENT_ADMIN_COLLECTION,
  TOURNAMENT_ADMIN_ROLE,
} from "./adminAccess";

function normalizeText(value) {
  return String(value || "").trim();
}

export function sanitizeTournamentAdmins(admins) {
  const seen = new Set();

  return (Array.isArray(admins) ? admins : [])
    .map((admin) => ({
      username: normalizeText(admin?.username),
      password: String(admin?.password || ""),
    }))
    .filter((admin) => admin.username || admin.password)
    .map((admin) => ({
      ...admin,
      usernameKey: admin.username.toLowerCase(),
    }))
    .filter((admin) => {
      if (!admin.username || !admin.password || seen.has(admin.usernameKey)) {
        return false;
      }

      seen.add(admin.usernameKey);
      return true;
    })
    .map(({ usernameKey, ...admin }) => admin);
}

export function validateTournamentAdmins(admins) {
  const normalizedAdmins = Array.isArray(admins) ? admins : [];
  const seen = new Set();

  for (const admin of normalizedAdmins) {
    const username = normalizeText(admin?.username);
    const password = String(admin?.password || "");

    if (!username && !password) {
      continue;
    }

    if (!username || !password) {
      return "Each tournament admin needs both a username and a password.";
    }

    const usernameKey = username.toLowerCase();

    if (seen.has(usernameKey)) {
      return "Tournament admin usernames must be unique within the tournament.";
    }

    seen.add(usernameKey);
  }

  return "";
}

export async function ensureTournamentAdminAccountsAvailable(
  db,
  tournamentId,
  nextAdmins,
  previousAdmins = []
) {
  const tournamentAdmins = db.collection(TOURNAMENT_ADMIN_COLLECTION);
  const mainAdmins = db.collection(MAIN_ADMIN_COLLECTION);
  const sanitizedNextAdmins = sanitizeTournamentAdmins(nextAdmins);
  const sanitizedPreviousAdmins = sanitizeTournamentAdmins(previousAdmins);
  const previousByKey = new Map(
    sanitizedPreviousAdmins.map((admin) => [admin.username.toLowerCase(), admin])
  );

  for (const admin of sanitizedNextAdmins) {
    const usernameKey = admin.username.toLowerCase();
    const mainAdmin = await mainAdmins.findOne({ username: admin.username });

    if (mainAdmin) {
      throw new Error(`"${admin.username}" is already used by a master admin.`);
    }

    const existingAccount = await tournamentAdmins.findOne({ username: admin.username });
    const isCurrentTournamentAccount = (existingAccount?.tournamentIds || []).includes(tournamentId);

    if (
      existingAccount &&
      existingAccount.password !== admin.password &&
      !previousByKey.has(usernameKey) &&
      !isCurrentTournamentAccount
    ) {
      throw new Error(`"${admin.username}" is already used by another tournament admin.`);
    }
  }
}

export async function syncTournamentAdminAccounts(
  db,
  tournamentId,
  nextAdmins,
  previousAdmins = []
) {
  const tournamentAdmins = db.collection(TOURNAMENT_ADMIN_COLLECTION);
  const sanitizedNextAdmins = sanitizeTournamentAdmins(nextAdmins);
  const sanitizedPreviousAdmins = sanitizeTournamentAdmins(previousAdmins);
  const nextByKey = new Map(
    sanitizedNextAdmins.map((admin) => [admin.username.toLowerCase(), admin])
  );

  for (const admin of sanitizedPreviousAdmins) {
    const usernameKey = admin.username.toLowerCase();

    if (nextByKey.has(usernameKey)) {
      continue;
    }

    const existingAccount = await tournamentAdmins.findOne({ username: admin.username });

    if (!existingAccount) {
      continue;
    }

    const remainingTournamentIds = (existingAccount.tournamentIds || []).filter(
      (currentId) => currentId !== tournamentId
    );

    if (!remainingTournamentIds.length) {
      await tournamentAdmins.deleteOne({ username: admin.username });
      continue;
    }

    await tournamentAdmins.updateOne(
      { username: admin.username },
      {
        $set: {
          tournamentIds: remainingTournamentIds,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  for (const admin of sanitizedNextAdmins) {
    const existingAccount = await tournamentAdmins.findOne({ username: admin.username });
    const nextTournamentIds = Array.from(
      new Set([...(existingAccount?.tournamentIds || []), tournamentId])
    );

    await tournamentAdmins.updateOne(
      { username: admin.username },
      {
        $set: {
          username: admin.username,
          password: admin.password,
          role: TOURNAMENT_ADMIN_ROLE,
          tournamentIds: nextTournamentIds,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }
}

export async function deleteTournamentAdminAccounts(db, tournamentId, currentAdmins = []) {
  await syncTournamentAdminAccounts(db, tournamentId, [], currentAdmins);
}
