import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { successResponse, badRequestResponse, errorResponse } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return badRequestResponse('Vui lòng nhập email');
    }

    const user = await User.findOne({ email });

    if (!user) {
      return badRequestResponse('Email không tồn tại');
    }

    if (user.isEmailVerified) {
      return badRequestResponse('Email đã được xác thực');
    }

    // Check cooldown (prevent spam) - 60 seconds
    if (user.verificationExpires && user.verificationExpires > new Date(Date.now() + 23 * 60 * 60 * 1000)) {
      return badRequestResponse('Vui lòng đợi 60 giây trước khi gửi lại');
    }

    // Generate new verification token
    const verificationToken = user.createVerificationToken();
    await user.save();

    try {
      await sendVerificationEmail(email, verificationToken, user.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return errorResponse('Không thể gửi email. Vui lòng thử lại sau.');
    }

    return successResponse({
      message: 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse('Đã xảy ra lỗi');
  }
}
