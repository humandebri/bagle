import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '削除する商品IDが指定されていません' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 削除する商品の情報を取得
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return NextResponse.json(
        { error: '商品情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 商品を一括削除
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .in('id', productIds);

    if (deleteError) {
      console.error('Error deleting products:', deleteError);
      return NextResponse.json(
        { error: '商品の削除に失敗しました' },
        { status: 500 }
      );
    }

    const deletedCount = products?.length || 0;
    const deletedNames = products?.map(p => p.name).join('、') || '';

    return NextResponse.json({ 
      success: true, 
      message: `${deletedCount}件の商品を削除しました`,
      deletedProducts: deletedNames
    });
  } catch (error) {
    console.error('Error in POST /api/products/bulk-delete:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}