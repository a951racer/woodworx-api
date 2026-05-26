import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  userId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
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
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'customerId',
});

customerSchema.index({ userId: 1, createdAt: 1 });

const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
