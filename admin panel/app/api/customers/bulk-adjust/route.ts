import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { customerIds, type, action, amount, reason } = await request.json();

    if (!customerIds?.length || !type || !action || !amount || !reason) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const updateField = type === 'balance' ? 'walletBalance' : 'loyaltyPoints';
    const adjustmentAmount = action === 'increase' ? amount : -amount;

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

        const notificationTitle = type === 'balance'
          ? `Wallet ${action === 'increase' ? 'Credited' : 'Debited'}`
          : `Points ${action === 'increase' ? 'Awarded' : 'Deducted'}`;

        const notificationMessage = type === 'balance'
          ? `Your wallet has been ${action === 'increase' ? 'credited with' : 'debited by'} ₹${amount}. Reason: ${reason}. Current balance: ₹${newValue}`
          : `${amount} loyalty points have been ${action === 'increase' ? 'awarded to' : 'deducted from'} your account. Reason: ${reason}. Current points: ${newValue}`;

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
