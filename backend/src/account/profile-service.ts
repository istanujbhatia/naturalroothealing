import { AppError } from '../errors.js';
import { toSafeUser, type SafeUser } from '../auth/safe-user.js';
import type { ProfileUpdate } from './schemas.js';

export type ProfileRecord = {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  emailVerifiedAt?: Date | null;
  createdAt: Date;
};

export type ProfileRepository = {
  findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>): Promise<ProfileRecord | null>;
};

export async function updateCustomerProfile(
  userId: string,
  input: ProfileUpdate,
  profiles: ProfileRepository,
): Promise<SafeUser> {
  const updated = await profiles.findOneAndUpdate(
    { _id: userId, role: 'customer', status: 'active' },
    { $set: input },
  );
  if (!updated) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
  return toSafeUser(updated);
}
