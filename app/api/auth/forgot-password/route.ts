import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { successResponse, badRequestResponse, errorResponse } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return badRequestResponse('Vui lòng nhập email');
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse({
        message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.name);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return errorResponse('Không thể gửi email. Vui lòng thử lại sau.');
    }

    return successResponse({
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse('Đã xảy ra lỗi');
  }
}
