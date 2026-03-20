import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'admin' | 'shop_owner' | 'employee';
  avatar?: string;
  shopId?: mongoose.Types.ObjectId;
  isActive: boolean;
  isEmailVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createVerificationToken(): string;
  createPasswordResetToken(): string;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu tối thiểu 6 ký tự'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Tên là bắt buộc'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'shop_owner', 'employee'],
      default: 'shop_owner',
    },
    avatar: String,
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.verificationToken;
        delete ret.verificationExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create 6-digit verification code
UserSchema.methods.createVerificationToken = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationToken = code;
  this.verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return code;
};

// Create 6-digit password reset code
UserSchema.methods.createPasswordResetToken = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordToken = code;
  this.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return code;
};

// Delete cached model to ensure schema updates (methods etc.) take effect during hot-reload
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', UserSchema);
