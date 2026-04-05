import crypto from "crypto";

export const ADMIN_SESSION_COOKIE = "fussgoal_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-this-admin-session-secret";
}

export function createAdminSessionToken(username) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}:${expiresAt}`;
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
    const [username, expiresAt, signature] = decoded.split(":");

    if (!username || !expiresAt || !signature) {
      return null;
    }

    const payload = `${username}:${expiresAt}`;
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

