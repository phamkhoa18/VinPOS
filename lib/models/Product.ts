import mongoose, { Schema, type Document } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Tên sản phẩm là bắt buộc'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'Mã SKU là bắt buộc'],
      trim: true,
      uppercase: true,
    },
    barcode: { type: String, trim: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Danh mục là bắt buộc'],
    },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    price: {
      type: Number,
      required: [true, 'Giá bán là bắt buộc'],
      min: [0, 'Giá không được âm'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Giá vốn không được âm'],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Tồn kho không được âm'],
    },
    minStock: {
      type: Number,
      default: 5,
    },
    unit: {
      type: String,
      default: 'Cái',
      trim: true,
    },
    image: String,
    description: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
ProductSchema.index({ sku: 1, shopId: 1 }, { unique: true });
ProductSchema.index({ barcode: 1, shopId: 1 });
ProductSchema.index({ name: 'text', sku: 'text' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
