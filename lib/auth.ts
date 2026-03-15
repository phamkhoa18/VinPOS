import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'vinpos-secret';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  shopId?: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('vinpos-token')?.value;

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) return null;

    return user;
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 });
}

export function badRequestResponse(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function notFoundResponse(message = 'Not found') {
  return Response.json({ error: message }, { status: 404 });
}

export function successResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}
