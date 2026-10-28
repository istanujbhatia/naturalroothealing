import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { hashOpaqueToken } from './crypto.js';
import { authenticateSession, loginAdmin, loginCustomer, registerCustomer, revokeSession } from './service.js';
import { registerSchema } from './schemas.js';

type User = {
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer';
  status: 'active' | 'suspended';
  createdAt: Date;
  emailVerifiedAt?: Date;
};

function repositories() {
  const users = new Map<string, User>();
  const sessions = new Map<string, {
    _id: { toString(): string };
    userId: { toString(): string };
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }>();
  let nextId = 1;
  const userRepository = {
    findOne: (query: Record<string, unknown>, projection?: string) => ({
      lean: async () => {
        const found = query.email
          ? [...users.values()].find((user) => user.email === query.email)
          : [...users.values()].find((user) => user._id.toString() === String(query._id));
        if (!found) return null;
        return projection?.includes('+passwordHash') ? found : { ...found, passwordHash: undefined };
      },
    }),
    create: async (document: Record<string, unknown>) => {
      const email = String(document.email);
      if (users.has(email)) throw { code: 11000 };
      const id = String(nextId++);
      const user = {
        ...document,
        _id: { toString: () => id },
        createdAt: new Date(),
      } as User;
      users.set(email, user);
      return user;
    },
  };
  const sessionRepository = {
    create: async (document: Record<string, unknown>) => {
      const id = String(nextId++);
      const session = {
        ...document,
        _id: { toString: () => id },
      } as typeof sessions extends Map<string, infer Value> ? Value : never;
      sessions.set(String(document.tokenHash), session);
      return session;
    },
    findOne: (query: Record<string, unknown>) => ({
      lean: async () => {
        const session = sessions.get(String(query.tokenHash));
        if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
        return session;
      },
    }),
    updateOne: async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      const session = sessions.get(String(query.tokenHash));
      if (session) session.revokedAt = new Date();
      return update;
    },
  };
  return { users, sessions, userRepository, sessionRepository };
}

describe('customer authentication', () => {
  it('registers a customer, hashes the password, and returns no password fields', async () => {
    const repos = repositories();
    const result = await registerCustomer(
      { name: ' Tanuj ', email: 'TANUJ@example.com ', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    );
    expect(repos.sessions.has(hashOpaqueToken(result.sessionToken))).toBe(true);

    expect(result.user).toMatchObject({ name: 'Tanuj', email: 'tanuj@example.com', role: 'customer' });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect([...repos.users.values()][0].passwordHash).not.toBe('a-secure-password');
  });

  it('rejects duplicate email registration safely', async () => {
    const repos = repositories();
    const input = { name: 'Tanuj', email: 'tanuj@example.com', password: 'a-secure-password' };
    await registerCustomer(input, repos.userRepository, repos.sessionRepository, 7);
    await expect(registerCustomer(input, repos.userRepository, repos.sessionRepository, 7))
      .rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('logs in with the right password and rejects the wrong password', async () => {
    const repos = repositories();
    const input = { name: 'Tanuj', email: 'tanuj@example.com', password: 'a-secure-password' };
    await registerCustomer(input, repos.userRepository, repos.sessionRepository, 7);
    await expect(loginCustomer(
      { email: input.email, password: input.password },
      repos.userRepository,
      repos.sessionRepository,
      7,
    )).resolves.toMatchObject({ user: { email: input.email } });
    await expect(loginCustomer(
      { email: input.email, password: 'wrong-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    )).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('keeps customer and admin login roles separate', async () => {
    const repos = repositories();
    const admin = await registerCustomer(
      { name: 'Admin', email: 'admin@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    );
    const stored = [...repos.users.values()][0];
    stored.role = 'admin';
    await expect(loginCustomer(
      { email: 'admin@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    )).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(loginAdmin(
      { email: 'admin@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    )).resolves.toMatchObject({ user: { role: 'admin' } });
    expect(admin.user.role).toBe('customer');
  });

  it('denies a customer session when an admin role is required', async () => {
    const repos = repositories();
    const result = await registerCustomer(
      { name: 'Customer', email: 'customer@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    );
    await expect(authenticateSession(result.sessionToken, repos.userRepository, repos.sessionRepository, 'admin'))
      .rejects.toMatchObject({ statusCode: 403, code: 'ADMIN_ACCESS_REQUIRED' });
  });

  it('denies suspended users even when their session is otherwise valid', async () => {
    const repos = repositories();
    const result = await registerCustomer(
      { name: 'Suspended', email: 'suspended@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    );
    const stored = [...repos.users.values()][0];
    stored.status = 'suspended';
    await expect(authenticateSession(result.sessionToken, repos.userRepository, repos.sessionRepository, 'admin'))
      .rejects.toMatchObject({ statusCode: 401, code: 'AUTHENTICATION_REQUIRED' });
  });

  it('rejects role escalation and invalid signup input', () => {
    expect(registerSchema.safeParse({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'a-secure-password',
      role: 'admin',
    }).success).toBe(false);
  });

  it('rejects expired sessions and revokes active sessions on logout', async () => {
    const repos = repositories();
    const result = await registerCustomer(
      { name: 'Tanuj', email: 'tanuj@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      7,
    );
    await expect(authenticateSession(result.sessionToken, repos.userRepository, repos.sessionRepository))
      .resolves.toMatchObject({ user: { email: 'tanuj@example.com' } });
    await revokeSession(result.sessionToken, repos.sessionRepository);
    await expect(authenticateSession(result.sessionToken, repos.userRepository, repos.sessionRepository))
      .rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    const expired = await registerCustomer(
      { name: 'Expired', email: 'expired@example.com', password: 'a-secure-password' },
      repos.userRepository,
      repos.sessionRepository,
      1,
    );
    const session = repos.sessions.get(hashOpaqueToken(expired.sessionToken));
    if (session && expired.sessionToken) session.expiresAt = new Date(Date.now() - 1);
    await expect(authenticateSession(expired.sessionToken, repos.userRepository, repos.sessionRepository))
      .rejects.toBeInstanceOf(AppError);
  });
});
