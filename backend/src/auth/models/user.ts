import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 40,
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    required: true,
    default: 'customer',
    immutable: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    required: true,
    default: 'active',
    index: true,
  },
  emailVerifiedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
