import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyOtp, OTP_TTL_MINUTES } from '@/lib/otpStore';

export async function POST(request: Request) {
  try {
    const { phone, code, role } = await request.json();

    console.log('\n🔍 VERIFY OTP REQUEST');
    console.log('Phone:', phone);
    console.log('Code:', code);
    console.log('Role:', role);

    if (!phone || !code) {
      return NextResponse.json({ success: false, error: 'Phone and code are required' }, { status: 400 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const result = verifyOtp(phone, code);

    // Test phone number for Google Play review
    const isTestPhone = phone === '+919999999999';
    // Development bypass: accept 123456 or stored OTP
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const bypass = (isDevelopment && code === '123456') || (isTestPhone && code === '123456');
    const isValidOtp = result.ok || bypass;

    console.log('Verify result:', result.ok ? (result.replay ? 'ok (repeat request)' : 'ok') : result.reason);

    if (isValidOtp) {
      const token = jwt.sign(
        { phone, role: role || 'customer' },
        jwtSecret,
        { expiresIn: '30d' }
      );

      console.log('\n✅ OTP Verified Successfully for:', phone, '\n');

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        token,
        phone
      });
    }
    
    const message: Record<string, string> = {
      mismatch: 'That OTP is not correct. Please check and try again.',
      expired: `This OTP is more than ${OTP_TTL_MINUTES} minutes old. Please tap Resend OTP.`,
      too_many_attempts: 'Too many wrong attempts. Please tap Resend OTP.',
      not_found: 'No OTP is waiting for this number. Please tap Resend OTP.',
    };

    return NextResponse.json({
      success: false,
      error: result.ok ? 'Invalid OTP' : message[result.reason]
    }, { status: 400 });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to verify OTP'
    }, { status: 500 });
  }
}
