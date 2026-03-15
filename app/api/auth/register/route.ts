import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import { generateToken, successResponse, badRequestResponse, errorResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password, name, phone, shopName, shopAddress, shopPhone } = await req.json();

    if (!email || !password || !name || !phone) {
      return badRequestResponse('Vui lòng điền đầy đủ thông tin');
    }

    // Check existing email
    const existing = await User.findOne({ email });
    if (existing) {
      return badRequestResponse('Email đã được sử dụng');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: 'shop_owner',
    });

    // Create shop
    const shop = await Shop.create({
      name: shopName || `Cửa hàng ${name}`,
      address: shopAddress || 'Chưa cập nhật',
      phone: shopPhone || phone,
      ownerId: user._id,
    });

    // Update user with shopId
    user.shopId = shop._id;
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      shopId: shop._id.toString(),
    });

    const response = successResponse({
      user: user.toJSON(),
      shopId: shop._id.toString(),
      token,
    }, 201);

    response.headers.set(
      'Set-Cookie',
      `vinpos-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Đã xảy ra lỗi khi đăng ký');
  }
}
