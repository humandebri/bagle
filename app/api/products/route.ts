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
        image_webp,
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

    // カテゴリーの表示順を定義
    const categoryOrder: Record<string, number> = {
      'シンプルベーグル': 1,
      'フィリングベーグル': 2,
      'クリームチーズ': 3,
      '定番商品': 4,
      'ベーグルサンドイッチ': 5,
    };

    // カテゴリーごとにグループ化して価格順でソート
    const sortedProducts = products?.sort((a, b) => {
      // @ts-expect-error Supabase returns category differently
      const categoryA = a.category?.name || '';
      // @ts-expect-error Supabase returns category differently
      const categoryB = b.category?.name || '';
      const orderA = categoryOrder[categoryA] || 999;
      const orderB = categoryOrder[categoryB] || 999;
      
      // まずカテゴリー順で比較
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 同じカテゴリーなら価格順（安い順）で比較
      return a.price - b.price;
    });

    return NextResponse.json(sortedProducts);
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
