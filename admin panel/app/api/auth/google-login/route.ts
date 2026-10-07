import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Partner from '@/models/Partner';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Support multiple client IDs (Web + Android + iOS)
const ALLOWED_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID, // Web client ID
  process.env.GOOGLE_ANDROID_CLIENT_ID, // Customer Android client ID
  process.env.GOOGLE_PARTNER_ANDROID_CLIENT_ID, // Partner Android client ID
  process.env.GOOGLE_IOS_CLIENT_ID, // Customer iOS client ID
  process.env.GOOGLE_PARTNER_IOS_CLIENT_ID, // Partner iOS client ID
].filter(Boolean);

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
    const { credential, idToken, role } = await request.json();
    console.log('Google Auth - Role:', role);
    console.log('Google Auth - Has credential:', !!credential);
    console.log('Google Auth - Has idToken:', !!idToken);
    console.log('Google Auth - ALLOWED_CLIENT_IDS:', ALLOWED_CLIENT_IDS);

    let ticket;
    const tokenToVerify = credential || idToken;
    
    if (!tokenToVerify) {
      return NextResponse.json({ success: false, error: 'No credential provided' }, { status: 400 });
    }

    // Try to verify with all allowed client IDs
    let verificationError;
    for (const clientId of ALLOWED_CLIENT_IDS) {
      try {
        ticket = await client.verifyIdToken({
          idToken: tokenToVerify,
          audience: clientId,
        });
        break; // Success, exit loop
      } catch (error) {
        verificationError = error;
        continue; // Try next client ID
      }
    }

    if (!ticket) {
      console.error('Token verification failed for all client IDs:', verificationError);
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    const { email, name, picture, sub: googleId } = payload;

    await dbConnect();

    if (role === 'customer') {
      let customer = await Customer.findOne({ email });

      if (!customer) {
        customer = await Customer.create({
          name,
          email,
          googleId,
          profileImage: picture,
          mobile: `google_${googleId}`,
          address: [],
          paymentMethods: [],
          walletBalance: 0,
        });
      }

      const token = jwt.sign(
        { customerId: customer._id, email: customer.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      const isNewUser = !customer.address || customer.address.length === 0;

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
    } else if (role === 'partner') {
      let partner = await Partner.findOne({ $or: [{ email }, { googleId }] });
      let isNewUser = false;

      if (!partner) {
        console.log('Creating NEW partner with Google login');
        partner = await Partner.create({
          name,
          email,
          googleId,
          profileImage: picture,
          mobile: `google_${googleId}`,
          kycStatus: 'pending',
          isActive: true,
        });
        isNewUser = true;
        console.log('New partner created, isNewUser set to TRUE');
      } else {
        console.log('Existing partner found, mobile:', partner.mobile);
        // Check if profile is incomplete (mobile still has google_ placeholder)
        isNewUser = partner.mobile?.startsWith('google_');
        console.log('isNewUser based on mobile:', isNewUser);
      }

      const token = jwt.sign(
        { partnerId: partner._id, email: partner.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      console.log('FINAL - Partner Google login - mobile:', partner.mobile, 'isNewUser:', isNewUser);

      return NextResponse.json({
        success: true,
        data: {
          partnerId: partner._id,
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          kycStatus: partner.kycStatus,
          isNewUser: isNewUser,
        },
        token,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Google login error:', error);
    return NextResponse.json({ success: false, error: 'Google login failed' }, { status: 500 });
  }
}
