import mongoose, { Schema, type Document } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  shopId: mongoose.Types.ObjectId;
  totalOrders: number;
  totalSpent: number;
  points: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Tên khách hàng là bắt buộc'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    note: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CustomerSchema.index({ phone: 1, shopId: 1 }, { unique: true });
CustomerSchema.index({ name: 'text', phone: 'text' });

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
