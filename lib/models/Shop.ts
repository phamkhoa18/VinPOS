import mongoose, { Schema, type Document } from 'mongoose';

export interface IShop extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  phone: string;
  email?: string;
  logo?: string;
  ownerId: mongoose.Types.ObjectId;
  taxCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: {
      type: String,
      required: [true, 'Tên cửa hàng là bắt buộc'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Địa chỉ là bắt buộc'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    email: { type: String, trim: true },
    logo: String,
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taxCode: String,
    isActive: {
      type: Boolean,
      default: true,
    },
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

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', ShopSchema);
