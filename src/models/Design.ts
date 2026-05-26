import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMaterialItem {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface IBoard {
  species: string;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
}

export interface IDesign extends Document {
  userId: Types.ObjectId;
  name: string;
  description: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'imperial' | 'metric';
  };
  materials: IMaterialItem[];
  boards: IBoard[];
  notes: string;
  thumbnailFileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialItemSchema = new Schema<IMaterialItem>(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const boardSchema = new Schema<IBoard>(
  {
    species: { type: String, required: true },
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    thickness: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const designSchema = new Schema<IDesign>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      unit: {
        type: String,
        enum: ['imperial', 'metric'],
        required: true,
      },
    },
    materials: {
      type: [materialItemSchema],
      default: [],
    },
    boards: {
      type: [boardSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    thumbnailFileId: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

designSchema.index({ userId: 1, createdAt: 1 });

const Design = mongoose.model<IDesign>('Design', designSchema);

export default Design;
