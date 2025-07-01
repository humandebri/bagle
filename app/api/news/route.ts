import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/news - 公開中のニュースを最新2件取得
export async function GET() {
  try {
    const news = await prisma.news.findMany({
      where: {
        is_published: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 2
    });

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'ニュースの取得に失敗しました' },
      { status: 500 }
    );
  }
}