import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import { generateToken, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return badRequestResponse('Email và mật khẩu là bắt buộc');
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return badRequestResponse('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      return badRequestResponse('Tài khoản đã bị vô hiệu hóa');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return badRequestResponse('Email hoặc mật khẩu không đúng');
    }

    // Get shop info if shop_owner
    let shopId: string | undefined;
    if (user.role === 'shop_owner' || user.role === 'employee') {
      const shop = await Shop.findOne({
        $or: [{ ownerId: user._id }, { _id: user.shopId }],
      });
      shopId = shop?._id?.toString();
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      shopId,
    });

    const response = successResponse({
      user: user.toJSON(),
      shopId,
      token,
    });

    // Set cookie
    response.headers.set(
      'Set-Cookie',
      `vinpos-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Đã xảy ra lỗi khi đăng nhập');
  }
}
