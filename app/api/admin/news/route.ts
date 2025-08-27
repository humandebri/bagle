import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Edgeランタイム対策
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 管理者権限チェック
async function checkAdminAuth() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return false;
    }
    
    // session.user.role で管理者チェック
    const isAdmin = (session.user as { role?: string }).role === 'admin';
    return isAdmin;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

// GET /api/admin/news - 管理用ニュース一覧（全て）
export async function GET() {
  try {
    // 管理者権限チェック
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const news = await prisma.news.findMany({
      orderBy: {
        date: 'desc'
      }
    });
    
    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { 
        error: 'ニュースの取得に失敗しました'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/news - ニュース作成
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, title, content, is_published } = body;

    if (!date || !title || !content) {
      return NextResponse.json(
        { error: 'date、title、contentは必須です' },
        { status: 400 }
      );
    }

    const news = await prisma.news.create({
      data: {
        date,
        title,
        content,
        is_published: is_published ?? true
      }
    });

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json(
      { error: 'ニュースの作成に失敗しました' },
      { status: 500 }
    );
  }
}