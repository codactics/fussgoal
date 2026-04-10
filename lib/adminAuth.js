import crypto from "crypto";
import { normalizeAdminRole } from "./adminAccess";

export const ADMIN_SESSION_COOKIE = "fussgoal_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-this-admin-session-secret";
}

export function createAdminSessionToken({ username, role }) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const normalizedRole = normalizeAdminRole(role);
  const payload = `${username}:${normalizedRole}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyAdminSessionToken(token) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    const isLegacyToken = parts.length === 3;
    const [username, roleOrExpiresAt, maybeExpiresAt, maybeSignature] = parts;
    const role = isLegacyToken ? "tournament_admin" : roleOrExpiresAt;
    const expiresAt = isLegacyToken ? roleOrExpiresAt : maybeExpiresAt;
    const signature = isLegacyToken ? maybeExpiresAt : maybeSignature;

    if (!username || !expiresAt || !signature) {
      return null;
    }

    const payload = isLegacyToken
      ? `${username}:${expiresAt}`
      : `${username}:${normalizeAdminRole(role)}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", getSessionSecret())
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    if (Number(expiresAt) < Date.now()) {
      return null;
    }

    return {
      username,
      role: normalizeAdminRole(role),
      expiresAt: Number(expiresAt),
    };
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
