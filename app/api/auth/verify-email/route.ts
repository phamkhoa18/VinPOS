import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { code, email } = await req.json();

    if (!code || !email) {
      return badRequestResponse('Mã xác thực và email là bắt buộc');
    }

    const user = await User.findOne({
      email,
      verificationToken: code,
      verificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return badRequestResponse('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return successResponse({
      message: 'Email đã được xác thực thành công! Bạn có thể đăng nhập ngay.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return errorResponse('Đã xảy ra lỗi khi xác thực email');
  }
}
