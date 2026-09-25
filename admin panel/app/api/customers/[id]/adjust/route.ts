import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import connectDB from '@/lib/mongodb';
import WalletTransaction from '@/models/WalletTransaction';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    
    const { type, action, amount, reason, adjustedBy } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    if (!type || !action || !amount || !reason) {
      return NextResponse.json(
        { success: false, error: 'Type, action, amount, and reason are required' },
        { status: 400 }
      );
    }

    // Get customer details
    const customer = await db.collection('customers').findOne({
      _id: new ObjectId(id)
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate new value
    const currentValue = type === 'balance' ? (customer.walletBalance || 0) : (customer.loyaltyPoints || 0);
    const adjustmentAmount = action === 'increase' ? amount : -amount;
    const newValue = Math.max(0, currentValue + adjustmentAmount);

    // Update customer
    const updateField = type === 'balance' ? 'walletBalance' : 'loyaltyPoints';
    await db.collection('customers').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [updateField]: newValue,
          updatedAt: new Date().toISOString()
        }
      }
    );

    // Record this change in the wallet transaction history so it shows up in the customer's Wallet page
    await connectDB();
    await WalletTransaction.create({
      customerId: id,
      type,
      action,
      amount,
      reason,
      previousValue: currentValue,
      newValue,
      adjustedBy: adjustedBy || 'Admin'
    });

    // Create and send notification
    const notificationTitle = type === 'balance' 
      ? `Wallet ${action === 'increase' ? 'Credited' : 'Debited'}`
      : `Points ${action === 'increase' ? 'Awarded' : 'Deducted'}`;
    
    const notificationMessage = type === 'balance'
      ? `Your wallet has been ${action === 'increase' ? 'credited with' : 'debited by'} ₹${amount}. Reason: ${reason}. Current balance: ₹${newValue}`
      : `${amount} loyalty points have been ${action === 'increase' ? 'awarded to' : 'deducted from'} your account. Reason: ${reason}. Current points: ${newValue}`;

    // Save notification to database
    await db.collection('notifications').insertOne({
      title: notificationTitle,
      message: notificationMessage,
      audience: 'Customers',
      status: 'sent',
      targetCustomerId: id, // Specific customer targeting
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`Notification sent to customer ${customer.name}:`, {
      title: notificationTitle,
      message: notificationMessage
    });

    return NextResponse.json({
      success: true,
      message: `${type === 'balance' ? 'Balance' : 'Points'} adjusted successfully`,
      data: {
        customerId: id,
        customerName: customer.name,
        type,
        action,
        amount,
        reason,
        oldValue: currentValue,
        newValue,
        notificationSent: true
      }
    });
  } catch (error) {
    console.error('Failed to adjust wallet/points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust wallet/points' },
      { status: 500 }
    );
  }
}