import { Schema, model } from 'mongoose';

const articleSectionSchema = new Schema({
  kind: { type: String, enum: ['paragraph', 'heading', 'quote'], required: true },
  text: { type: String, required: true, trim: true, maxlength: 5000 },
}, { _id: false });

const articleSchema = new Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  type: { type: String, required: true, trim: true, maxlength: 60 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  excerpt: { type: String, required: true, trim: true, maxlength: 300 },
  image: { type: String, required: true, trim: true, maxlength: 500 },
  publishedAt: { type: Date, required: true },
  readMinutes: { type: Number, required: true, min: 1, max: 60 },
  lead: { type: String, required: true, trim: true, maxlength: 2000 },
  sections: { type: [articleSectionSchema], default: [] },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
}, { timestamps: true, versionKey: false });

export const ArticleModel = model('Article', articleSchema);
