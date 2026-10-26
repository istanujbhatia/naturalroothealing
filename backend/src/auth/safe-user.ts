export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: Date;
};

export function toSafeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  emailVerifiedAt?: Date | null;
  createdAt: Date;
}): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    ...(user.phone ? { phone: user.phone } : {}),
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}
