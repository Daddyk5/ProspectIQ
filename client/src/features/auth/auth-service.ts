import type { SignInValues } from './auth-schema';

export type AuthProvider = 'password' | 'google' | 'microsoft';

export interface Session {
  user: { name: string; email: string; org: string };
  provider: AuthProvider;
  issuedAt: string;
}

export class AuthError extends Error {
  readonly code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'PROVIDER_CANCELLED' | 'NETWORK';

  constructor(code: AuthError['code'], message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * SIMULATED authentication. Replace these two functions with calls to your
 * identity provider (e.g. POST /api/auth/login, or an OIDC redirect for SSO);
 * the UI only depends on the Session / AuthError contract.
 *
 * Demo behaviour so every UI state can be exercised:
 *  - password "wrong-password"      → INVALID_CREDENTIALS
 *  - email "locked@prospectiq.io"   → ACCOUNT_LOCKED
 *  - anything else that passes validation signs in
 */
export async function signInWithPassword(values: SignInValues): Promise<Session> {
  await sleep(900);
  if (values.email.toLowerCase() === 'locked@prospectiq.io') {
    throw new AuthError('ACCOUNT_LOCKED', 'This account is locked. Contact your workspace administrator.');
  }
  if (values.password === 'wrong-password') {
    throw new AuthError('INVALID_CREDENTIALS', 'That email and password combination is incorrect.');
  }
  return {
    user: { name: nameFromEmail(values.email), email: values.email, org: values.email.split('@')[1] },
    provider: 'password',
    issuedAt: new Date().toISOString(),
  };
}

export async function signInWithProvider(provider: 'google' | 'microsoft'): Promise<Session> {
  await sleep(1200);
  const email = provider === 'google' ? 'jordan.reyes@gmail-workspace.example' : 'jordan.reyes@contoso.example';
  return {
    user: { name: 'Jordan Reyes', email, org: provider === 'google' ? 'Google Workspace' : 'Microsoft Entra ID' },
    provider,
    issuedAt: new Date().toISOString(),
  };
}
