import { NextRequest, NextResponse } from 'next/server';
import appleSignin from 'apple-signin-auth';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import jwt from 'jsonwebtoken';

const APPLE_BUNDLE_ID = 'com.acsgroup.urbansteam.customer';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { identityToken, role } = await request.json();

    if (!identityToken) {
      return NextResponse.json(
        { success: false, error: 'No identity token provided' },
        { status: 400 }
      );
    }

    if (role !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Verify the Apple identity token against Apple's public keys
    let applePayload: any;
    try {
      applePayload = await appleSignin.verifyIdToken(identityToken, {
        audience: APPLE_BUNDLE_ID,
        ignoreExpiration: false,
      });
    } catch (verifyError) {
      console.error('Apple token verification failed:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Invalid Apple identity token' },
        { status: 400 }
      );
    }

    const sub: string = applePayload.sub;
    // Apple only provides name/email on the first sign-in; fall back to empty string
    const email: string = applePayload.email || '';
    // The `name` claim is not part of the standard Apple JWT payload —
    // it is sent separately in the authorization response. The backend
    // receives only the identity token, so name defaults to empty string
    // on all sign-ins after the first (handled by the client sending it).
    const name: string = applePayload.name || '';

    await dbConnect();

    let customer = await Customer.findOne({ appleId: sub });
    let isNewUser = false;

    if (!customer) {
      customer = await Customer.create({
        name,
        email,
        appleId: sub,
        mobile: `apple_${sub}`,
        address: [],
        paymentMethods: [],
        walletBalance: 0,
      });
      isNewUser = true;
    }

    const token = jwt.sign(
      { customerId: customer._id, email: customer.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      data: {
        customerId: customer._id,
        name: customer.name,
        email: customer.email,
        isNewUser,
      },
      token,
    });
  } catch (error) {
    console.error('Apple login error:', error);
    return NextResponse.json(
      { success: false, error: 'Apple login failed' },
      { status: 500 }
    );
  }
}
