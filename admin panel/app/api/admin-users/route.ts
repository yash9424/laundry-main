import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AdminUser from '@/models/AdminUser';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (email) {
      const user = await AdminUser.find({ email }).select('-password');
      return NextResponse.json({ success: true, data: user });
    }
    
    const users = await AdminUser.find().select('-password');
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

    await dbConnect();
    const data = await request.json();
    
    // Hash password before saving
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const user = await AdminUser.create(data);
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

    await dbConnect();
    const { _id, password, oldPassword, ...data } = await request.json();
    
    // If password change is requested, verify old password
    if (password) {
      if (!oldPassword) {
        return NextResponse.json({ success: false, error: 'Old password is required' }, { status: 400 });
      }
      
      const user = await AdminUser.findById(_id);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        return NextResponse.json({ success: false, error: 'Old password is incorrect' }, { status: 400 });
      }
      
      data.password = await bcrypt.hash(password, 10);
    }
    
    const user = await AdminUser.findByIdAndUpdate(_id, data, { new: true });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await AdminUser.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
