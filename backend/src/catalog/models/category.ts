import { Schema, model, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    required: true,
    default: 'active',
    index: true,
  },
  sortOrder: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'sortOrder must be an integer',
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

categorySchema.index({ status: 1, sortOrder: 1 });

export type Category = InferSchemaType<typeof categorySchema>;
export const CategoryModel = model('Category', categorySchema);
