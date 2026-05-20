import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PricingCategory from '@/models/PricingCategory';

export async function GET() {
  try {
    await dbConnect();
    const categories = await PricingCategory.find().sort({ order: 1, createdAt: 1 });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    if (body.reorder) {
      await Promise.all(body.reorder.map(({ id, order }: { id: string; order: number }) =>
        PricingCategory.findByIdAndUpdate(id, { order })
      ));
    } else {
      const update: any = { name: body.name };
      if (body.image !== undefined) update.image = body.image;
      await PricingCategory.findByIdAndUpdate(body.id, update);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { name, image } = await request.json();
    const category = await PricingCategory.create({ name, image: image || '' });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await PricingCategory.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 });
  }
}
