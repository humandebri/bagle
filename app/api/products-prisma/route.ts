import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await prisma.products.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        long_description: true,
        price: true,
        image: true,
        is_available: true,
        is_limited: true,
        start_date: true,
        end_date: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products with Prisma:', error);
    return NextResponse.json({ error: '商品データの取得に失敗しました' }, { status: 500 });
  }
}