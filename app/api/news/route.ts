import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/news - 公開中のニュースを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    
    const query = {
      where: {
        is_published: true
      },
      orderBy: {
        date: 'desc' as const
      },
      ...(limit && { take: parseInt(limit) })
    };
    
    const news = await prisma.news.findMany(query);

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'ニュースの取得に失敗しました' },
      { status: 500 }
    );
  }
}