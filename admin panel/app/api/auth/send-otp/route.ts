import { NextResponse } from 'next/server';
import { saveOtp, pendingCount } from '@/lib/otpStore';
import { IndoriSmsService } from '@/lib/indoriSms';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    // Test phone number for Google Play review
    if (phone === '+919999999999') {
      saveOtp(phone, '123456');
      console.log('\n========================================');
      console.log('📱 TEST OTP FOR GOOGLE PLAY REVIEW');
      console.log('Phone:', phone);
      console.log('OTP: 123456');
      console.log('========================================\n');
      return NextResponse.json({
        success: true,
        message: 'Test OTP sent successfully'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(phone, otp);

    // Send OTP via Indori SMS
    const smsResult = await IndoriSmsService.sendOTP(phone, otp);
    
    console.log('\n========================================');
    console.log('📱 OTP GENERATED & SENT');
    console.log('Phone:', phone);
    console.log('OTP:', otp);
    console.log('SMS Status:', smsResult ? 'SUCCESS' : 'FAILED');
    console.log('Pending codes:', pendingCount());
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      message: smsResult ? 'OTP sent successfully' : 'OTP generated (SMS failed)'
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send OTP'
    }, { status: 500 });
  }
}


