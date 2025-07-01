import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        long_description,
        price,
        image,
        is_available,
        is_limited,
        start_date,
        end_date,
        category:categories (
          id,
          name
        )
      `);
    
    // 管理画面からの場合はすべての商品を表示、それ以外は販売中のみ
    if (!showAll) {
      query = query.eq('is_available', true);
    }
    
    const { data: products, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: '商品データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
