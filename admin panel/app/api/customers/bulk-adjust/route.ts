import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import connectDB from '@/lib/mongodb';
import WalletTransaction from '@/models/WalletTransaction';

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { customerIds, type, action, amount, reason } = await request.json();

    if (!customerIds?.length || !type || !action || !amount || !reason) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Wallet only: points are no longer part of the product.
    if (type !== 'balance') {
      return NextResponse.json({ success: false, error: 'Only the wallet balance can be adjusted' }, { status: 400 });
    }

    const updateField = 'walletBalance';
    const adjustmentAmount = action === 'increase' ? amount : -amount;
    await connectDB();

    const results = await Promise.all(
      customerIds.map(async (id: string) => {
        if (!ObjectId.isValid(id)) return { id, success: false };
        const customer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
        if (!customer) return { id, success: false };

        const currentValue = customer[updateField] || 0;
        const newValue = Math.max(0, currentValue + adjustmentAmount);

        await db.collection('customers').updateOne(
          { _id: new ObjectId(id) },
          { $set: { [updateField]: newValue, updatedAt: new Date().toISOString() } }
        );

        // Record this change in the wallet transaction history so it shows up in the customer's Wallet page
        await WalletTransaction.create({
          customerId: id,
          type,
          action,
          amount,
          reason,
          previousValue: currentValue,
          newValue,
          adjustedBy: 'Admin'
        });

        const notificationTitle = `Wallet ${action === 'increase' ? 'Credited' : 'Debited'}`;

        const notificationMessage = `Your wallet has been ${action === 'increase' ? 'credited with' : 'debited by'} ₹${amount}. Reason: ${reason}. Current balance: ₹${newValue}`;

        await db.collection('notifications').insertOne({
          title: notificationTitle,
          message: notificationMessage,
          audience: 'Customers',
          status: 'sent',
          targetCustomerId: id,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        return { id, success: true };
      })
    );

    const succeeded = results.filter(r => r.success).length;
    return NextResponse.json({ success: true, message: `Adjusted ${succeeded} of ${customerIds.length} customers` });
  } catch (error) {
    console.error('Bulk adjust error:', error);
    return NextResponse.json({ success: false, error: 'Bulk adjust failed' }, { status: 500 });
  }
}
