/**
 * Signed tokens, and the guard that checks them.
 *
 * Until now every route took the caller at their word: an id in the query
 * string said who you were, and nothing proved it. That is tolerable for a
 * read of your own order; it is not tolerable for creating an administrator,
 * crediting a wallet, or approving a KYC submission, all of which anyone who
 * could reach the server was free to do.
 *
 * Two kinds of token exist and they are deliberately not interchangeable.
 * Phone sign-in has always issued one carrying `phone` and a role, and the
 * apps already store it. Administrators now get their own, carrying an
 * `aud` of 'admin', so a customer's token -- which anyone can obtain with
 * their own phone number -- cannot be presented as an administrator's.
 *
 * The secret is required. There used to be a fallback of 'your-secret-key'
 * in two of the sign-in routes, which is the same as having no secret at
 * all, because anyone could mint a token with it.
 */
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_AUDIENCE = 'admin';

/** Eight hours: a working day, so nobody is signed out mid-shift. */
const ADMIN_TOKEN_TTL = '8h';

export interface AdminClaims {
  sub: string;
  role: string;
  email: string;
  username: string;
  hub?: string | null;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
}

export function signAdminToken(claims: AdminClaims): string {
  return jwt.sign(claims, secret(), {
    expiresIn: ADMIN_TOKEN_TTL,
    audience: ADMIN_AUDIENCE,
  });
}

/** The claims if the request carries a valid administrator token, else null. */
export function readAdminToken(request: NextRequest): AdminClaims | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  try {
    const claims = jwt.verify(token, secret(), { audience: ADMIN_AUDIENCE });
    if (!claims || typeof claims !== 'object') return null;
    return claims as unknown as AdminClaims;
  } catch {
    // Expired, tampered with, or signed for something other than the admin
    // panel. All of them mean the same thing here.
    return null;
  }
}

/**
 * Returns a response to send back when the caller is not an administrator,
 * or null when they are. Written this way so a route reads as a guard clause:
 *
 *   const denied = requireAdmin(request)
 *   if (denied) return denied
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  let claims: AdminClaims | null = null;
  try {
    claims = readAdminToken(request);
  } catch (error) {
    // Only thrown when the server has no JWT_SECRET, which is a deployment
    // fault rather than the caller's. Say so distinctly so it is not chased
    // as a login problem.
    console.error('auth: cannot verify tokens —', (error as Error).message);
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!claims) {
    return NextResponse.json(
      { success: false, error: 'Please sign in again.' },
      { status: 401 }
    );
  }

  return null;
}

/** As above, and also refuses anyone whose role is not in the list. */
export function requireRole(request: NextRequest, roles: string[]): NextResponse | null {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const claims = readAdminToken(request);
  if (!claims || !roles.includes(claims.role)) {
    return NextResponse.json(
      { success: false, error: 'You do not have access to this.' },
      { status: 403 }
    );
  }
  return null;
}
