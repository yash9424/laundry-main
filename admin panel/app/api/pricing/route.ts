import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PricingItem from '@/models/PricingItem';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    const filter = category && category !== 'All' ? { category, isActive: true } : { isActive: true };
    const items = await PricingItem.find(filter).sort({ order: 1, createdAt: -1 });
    
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { name, price, category } = await request.json();
    
    const item = await PricingItem.create({ name, price, category });
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Pricing POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    if (body.reorder) {
      await Promise.all(body.reorder.map(({ id, order }: { id: string; order: number }) =>
        PricingItem.findByIdAndUpdate(id, { order })
      ));
      return NextResponse.json({ success: true });
    }
    const { id, name, price, category } = body;
    const item = await PricingItem.findByIdAndUpdate(id, { name, price, category }, { new: true });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await PricingItem.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete item' }, { status: 500 });
  }
}