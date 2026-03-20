import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Shop from '@/lib/models/Shop';
import { badRequestResponse, errorResponse, successResponse } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password, name, phone, shopName, shopAddress, shopPhone } = await req.json();

    if (!email || !password || !name || !phone) {
      return badRequestResponse('Vui lòng điền đầy đủ thông tin');
    }

    if (password.length < 6) {
      return badRequestResponse('Mật khẩu tối thiểu 6 ký tự');
    }

    // Check existing email
    const existing = await User.findOne({ email });
    if (existing) {
      return badRequestResponse('Email đã được sử dụng');
    }

    // Create user (not verified yet)
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: 'shop_owner',
      isEmailVerified: false,
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

    // Generate verification token
    const verificationToken = user.createVerificationToken();
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // User is still created, just log the error
    }

    return successResponse({
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      needVerification: true,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Đã xảy ra lỗi khi đăng ký');
  }
}
