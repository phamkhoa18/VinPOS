import mongoose, { Schema, type Document } from 'mongoose';

export interface IInventoryLog extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  action: 'import' | 'export' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  referenceId?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    action: {
      type: String,
      enum: ['import', 'export', 'adjustment', 'sale', 'return'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    note: { type: String, trim: true },
    referenceId: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

InventoryLogSchema.index({ productId: 1, createdAt: -1 });
InventoryLogSchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.models.InventoryLog || mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
