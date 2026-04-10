export const MASTER_ADMIN_ROLE = "master_admin";
export const TOURNAMENT_ADMIN_ROLE = "tournament_admin";
export const MAIN_ADMIN_COLLECTION = "main_admin";
export const TOURNAMENT_ADMIN_COLLECTION = "tournament_admin";

export function normalizeAdminRole(role) {
  return role === MASTER_ADMIN_ROLE ? MASTER_ADMIN_ROLE : TOURNAMENT_ADMIN_ROLE;
}

export function getAdminCollectionName(role) {
  return normalizeAdminRole(role) === MASTER_ADMIN_ROLE
    ? MAIN_ADMIN_COLLECTION
    : TOURNAMENT_ADMIN_COLLECTION;
}

export function sanitizeAdmin(admin) {
  if (!admin?.username) {
    return null;
  }

  return {
    username: admin.username,
    role: normalizeAdminRole(admin.role),
  };
}

export function isMasterAdminSession(session) {
  return normalizeAdminRole(session?.role) === MASTER_ADMIN_ROLE;
}

export function canAdminAccessTournament(session, tournament) {
  if (!session || !tournament) {
    return false;
  }

  if (isMasterAdminSession(session)) {
    return true;
  }

  return Boolean(tournament.ownerUsername) && tournament.ownerUsername === session.username;
}

export function buildTournamentAdminFilter(session) {
  if (!session) {
    return null;
  }

  if (isMasterAdminSession(session)) {
    return {};
  }

  return { ownerUsername: session.username };
}
