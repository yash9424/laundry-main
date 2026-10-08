import { NextResponse } from 'next/server';
import { saveOtp, pendingCount, canSendOtp, noteOtpSent } from '@/lib/otpStore';
import { IndoriSmsService } from '@/lib/indoriSms';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    // One number, a handful of codes an hour. Every send is a real billable SMS
    // through Indori, and without a cap the same number can be pestered on
    // repeat by anyone who knows it.
    const allowance = canSendOtp(phone);
    if (!allowance.ok) {
      const wait = allowance.retryAfterSeconds;
      return NextResponse.json(
        {
          success: false,
          error:
            allowance.reason === 'too_soon'
              ? `Please wait ${wait} seconds before asking for another code.`
              : `Too many codes requested for this number. Please try again in ${Math.ceil(wait / 60)} minutes.`,
          retryAfterSeconds: wait,
        },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      );
    }

    // Test phone number for Google Play review
    if (phone === '+919999999999') {
      saveOtp(phone, '123456');
      noteOtpSent(phone);
      console.log('Test number used the fixed review code');
      return NextResponse.json({
        success: true,
        message: 'Test OTP sent successfully'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOtp(phone, otp);
    noteOtpSent(phone);

    // Send OTP via Indori SMS
    const smsResult = await IndoriSmsService.sendOTP(phone, otp);

    // The code is never written to the log. It used to be printed in full, so
    // anyone who could read the server log could sign in as whoever had just
    // asked for one.
    console.log(
      `OTP sent to ${String(phone).slice(0, -4)}**** - SMS ${smsResult ? 'ok' : 'failed'}, ${pendingCount()} pending`
    );

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
