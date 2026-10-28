import argon2 from 'argon2';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { UserModel } from '../auth/models/user.js';

async function provisionAdmin() {
  const config = loadConfig();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) throw new Error('ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD are required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);
  try {
    const existingAdmin = await UserModel.exists({ role: 'admin' });
    if (existingAdmin) throw new Error('An administrator is already provisioned');
    const existingEmail = await UserModel.exists({ email });
    if (existingEmail) throw new Error('That email is already registered');
    await UserModel.create({
      name,
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: 'admin',
      status: 'active',
    });
    logger.info({ email }, 'Initial administrator provisioned');
  } finally {
    await disconnectDatabase(logger);
  }
}

provisionAdmin().catch((error: unknown) => {
  process.stderr.write(`Admin provisioning failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`);
  process.exitCode = 1;
});
