import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettings extends Document {
  userId: Types.ObjectId;
  measurementSystem: 'imperial' | 'metric';
  margins: {
    length: number;
    width: number;
    thickness: number;
  };
  driveStoragePath: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    measurementSystem: {
      type: String,
      enum: ['imperial', 'metric'],
      default: 'imperial',
    },
    margins: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      thickness: { type: Number, default: 0 },
    },
    driveStoragePath: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.index({ userId: 1, createdAt: 1 });

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
