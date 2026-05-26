import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGalleryItem extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  fileUrl: string;
  fileKey: string;
  mimeType: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<IGalleryItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileKey: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

galleryItemSchema.index({ userId: 1, createdAt: 1 });

const GalleryItem = mongoose.model<IGalleryItem>('GalleryItem', galleryItemSchema);

export default GalleryItem;
