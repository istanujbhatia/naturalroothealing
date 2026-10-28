import argon2 from 'argon2';
import { AppError } from '../errors.js';
import { createOpaqueToken, hashOpaqueToken } from './crypto.js';
import { toSafeUser, type SafeUser } from './safe-user.js';

export type UserRecord = {
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  emailVerifiedAt?: Date | null;
  createdAt: Date;
};

export type UserRepository = {
  findOne(query: Record<string, unknown>, projection?: string): { lean(): Promise<UserRecord | null> };
  create(document: Record<string, unknown>): Promise<UserRecord>;
};

export type SessionRecord = {
  _id: { toString(): string };
  userId: { toString(): string };
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type SessionRepository = {
  create(document: Record<string, unknown>): Promise<SessionRecord>;
  findOne(query: Record<string, unknown>, projection?: string): { lean(): Promise<SessionRecord | null> };
  updateOne(query: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
};

export type AuthResult = {
  user: SafeUser;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
};

export async function registerCustomer(
  input: { name: string; email: string; password: string; phone?: string },
  users: UserRepository,
  sessions: SessionRepository,
  sessionTtlDays: number,
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await users.findOne({ email }).lean();
  if (existing) {
    throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Unable to register with those details');
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  let user: UserRecord;
  try {
    user = await users.create({
      name: input.name.trim(),
      email,
      passwordHash,
      ...(input.phone ? { phone: input.phone.trim() } : {}),
      role: 'customer',
      status: 'active',
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Unable to register with those details');
    }
    throw error;
  }
  return createSession(user, sessions, sessionTtlDays);
}

export async function loginCustomer(
  input: { email: string; password: string },
  users: UserRepository,
  sessions: SessionRepository,
  sessionTtlDays: number,
): Promise<AuthResult> {
  return loginWithRole(input, users, sessions, sessionTtlDays, 'customer');
}

export async function loginAdmin(
  input: { email: string; password: string },
  users: UserRepository,
  sessions: SessionRepository,
  sessionTtlDays: number,
): Promise<AuthResult> {
  return loginWithRole(input, users, sessions, sessionTtlDays, 'admin');
}

async function loginWithRole(
  input: { email: string; password: string },
  users: UserRepository,
  sessions: SessionRepository,
  sessionTtlDays: number,
  role: 'customer' | 'admin',
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const user = await users.findOne({ email }, '+passwordHash').lean();
  if (!user || user.role !== role || !user.passwordHash || !(await argon2.verify(user.passwordHash, input.password))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable');
  }
  return createSession(user, sessions, sessionTtlDays);
}

export async function authenticateSession(
  sessionToken: string,
  users: UserRepository,
  sessions: SessionRepository,
  requiredRole: 'customer' | 'admin' = 'customer',
): Promise<{ user: SafeUser; session: SessionRecord }> {
  const session = await sessions.findOne({
    tokenHash: hashOpaqueToken(sessionToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }, '+tokenHash +csrfTokenHash').lean();
  if (!session) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
  const user = await users.findOne({ _id: session.userId }).lean();
  if (!user || user.status !== 'active') {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
  }
  if (user.role !== requiredRole) {
    throw requiredRole === 'admin'
      ? new AppError(403, 'ADMIN_ACCESS_REQUIRED', 'Administrator access required')
      : new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
  }
  return { user: toSafeUser(user), session };
}

export async function revokeSession(sessionToken: string, sessions: SessionRepository): Promise<void> {
  await sessions.updateOne(
    { tokenHash: hashOpaqueToken(sessionToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

function createSession(user: UserRecord, sessions: SessionRepository, sessionTtlDays: number): Promise<AuthResult> {
  const sessionToken = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);
  return sessions.create({
    userId: user._id,
    tokenHash: hashOpaqueToken(sessionToken),
    csrfTokenHash: hashOpaqueToken(csrfToken),
    expiresAt,
    revokedAt: null,
  }).then(() => ({
    user: toSafeUser(user),
    sessionToken,
    csrfToken,
    expiresAt,
  }));
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
