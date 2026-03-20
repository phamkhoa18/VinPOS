import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { code, email, password } = await req.json();

    if (!code || !email || !password) {
      return badRequestResponse('Mã xác thực, email và mật khẩu mới là bắt buộc');
    }

    if (password.length < 6) {
      return badRequestResponse('Mật khẩu tối thiểu 6 ký tự');
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return badRequestResponse('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return successResponse({
      message: 'Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập ngay.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse('Đã xảy ra lỗi khi đặt lại mật khẩu');
  }
}
