import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/lib/prisma';

// Edgeランタイム対策
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 管理者権限チェック
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return false;
  }
  
  // session.user.role で管理者チェック
  return (session.user as { role?: string }).role === 'admin';
}

// PUT /api/admin/news/[id] - ニュース更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      console.log('Admin check failed - no admin privileges');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { date, title, content, is_published } = body;

    if (!date || !title || !content) {
      return NextResponse.json(
        { error: 'date、title、contentは必須です' },
        { status: 400 }
      );
    }

    const news = await prisma.news.update({
      where: { id },
      data: {
        date,
        title,
        content,
        is_published
      }
    });

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json(
      { error: 'ニュースの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/news/[id] - ニュース削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      console.log('Admin check failed - no admin privileges');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.news.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json(
      { error: 'ニュースの削除に失敗しました' },
      { status: 500 }
    );
  }
}