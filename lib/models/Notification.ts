import mongoose, { Schema, type Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  type: 'new_order' | 'low_stock' | 'order_cancelled' | 'system' | 'info';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    type: {
      type: String,
      enum: ['new_order', 'low_stock', 'order_cancelled', 'system', 'info'],
      default: 'info',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
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

NotificationSchema.index({ shopId: 1, createdAt: -1 });
NotificationSchema.index({ shopId: 1, isRead: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
