import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: products, error } = await supabase
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
      `)
      .order('created_at', { ascending: false })
      .eq('is_available', true);

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: '商品データの取得に失敗しました' }, { status: 500 });
    }

    // Ensure empty image strings or undefined are converted to null
    const sanitizedProducts = products?.map(product => ({
      ...product,
      image: (!product.image || product.image === '') ? null : product.image
    })) || [];

    return NextResponse.json(sanitizedProducts);
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
