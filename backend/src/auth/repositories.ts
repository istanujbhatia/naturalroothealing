import { SessionModel } from './models/session.js';
import { UserModel } from './models/user.js';
import type { SessionRecord, SessionRepository, UserRepository, UserRecord } from './service.js';

export const userRepository: UserRepository = {
  findOne(query, projection) {
    return {
      lean: async () => {
        const document = await UserModel.findOne(query).select(projection ?? '').lean();
        if (!document) return null;
        return {
          ...document,
          _id: document._id,
          passwordHash: document.passwordHash,
          phone: document.phone,
          emailVerifiedAt: document.emailVerifiedAt,
          createdAt: document.createdAt,
        } as UserRecord;
      },
    };
  },
  async create(document) {
    const created = await UserModel.create(document);
    return created.toObject() as UserRecord;
  },
};

export const sessionRepository: SessionRepository = {
  findOne(query, projection) {
    return {
      lean: async () => {
        const document = await SessionModel.findOne(query).select(projection ?? '').lean();
        if (!document) return null;
        return {
          _id: document._id,
          userId: document.userId,
          tokenHash: document.tokenHash,
          csrfTokenHash: document.csrfTokenHash,
          expiresAt: document.expiresAt,
          revokedAt: document.revokedAt ?? null,
        } as SessionRecord;
      },
    };
  },
  async create(document) {
    const created = await SessionModel.create(document);
    return {
      _id: created._id,
      userId: created.userId,
      tokenHash: created.tokenHash,
      csrfTokenHash: created.csrfTokenHash,
      expiresAt: created.expiresAt,
      revokedAt: created.revokedAt ?? null,
    };
  },
  updateOne(query, update) {
    return SessionModel.updateOne(query, update).exec();
  },
};
