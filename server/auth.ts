import crypto from 'crypto';
import { User } from './types.js';

// ─── Session Secret ─────────────────────────────────────────────────────────
// In serverless environments (Vercel), there's no persistent filesystem.
// Use SESSION_SECRET from env var, or derive one deterministically from SUPABASE_SERVICE_ROLE_KEY.
function getSessionSecret(): string {
  // 1. Explicit session secret (recommended for production)
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }

  // 2. Derive from Supabase key (deterministic — tokens survive cold starts)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return crypto
      .createHash('sha256')
      .update('hisaabdo_session_' + process.env.SUPABASE_SERVICE_ROLE_KEY)
      .digest('hex');
  }

  // 3. Fallback
  return 'hisaabdo_secure_persistent_session_secret_key_2025';
}

const SESSION_SECRET = getSessionSecret();

// Track revoked tokens in memory.
// In serverless, this resets on cold starts — acceptable since tokens are HMAC-verified
// and have a 30-day expiry. Worst case: a revoked token works until the next cold start.
const revokedTokens = new Set<string>();

// Fallback in-memory active tokens to user IDs for legacy tokens
const legacyTokenStore = new Map<string, { userId: string; expiresAt: number }>();

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Creates an HMAC-signed session token containing { userId, expiresAt }
 * This token survives server restarts and remains valid across sessions.
 */
export function createSessionToken(userId: string): string {
  // Token valid for 30 days
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payloadStr = JSON.stringify({ u: userId, exp: expiresAt, v: 1 });
  const payloadB64 = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

  const token = `${payloadB64}.${signature}`;
  legacyTokenStore.set(token, { userId, expiresAt });
  return token;
}

/**
 * Verifies and extracts the userId from the session token.
 */
export function getUserIdFromToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  if (revokedTokens.has(token)) return null;

  // Signed token format: payload.signature
  const parts = token.split('.');
  if (parts.length === 2) {
    const [payloadB64, signature] = parts;
    try {
      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
      if (
        signature.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
      ) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      if (!decoded || !decoded.u || !decoded.exp) return null;

      if (Date.now() > decoded.exp) {
        return null;
      }

      return decoded.u;
    } catch {
      return null;
    }
  }

  // Fallback for legacy memory tokens
  const session = legacyTokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    legacyTokenStore.delete(token);
    return null;
  }
  return session.userId;
}

export function revokeToken(token: string): void {
  if (!token) return;
  revokedTokens.add(token);
  legacyTokenStore.delete(token);
}
