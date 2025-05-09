import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }   // ★ Promise にする
) {
  const { id } = await params                        // ★ await で展開

  try {
    const supabase = await createServerSupabaseClient()

    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
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
        category:categories ( name )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('[GET /api/products/:id] fetch error', error)
      return NextResponse.json(
        { error: '商品データの取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりませんでした' },
        { status: 404 }
      )
    }

    if (!product.is_available) {
      return NextResponse.json(
        { error: 'この商品は現在販売していません' },
        { status: 400 }
      )
    }

    return NextResponse.json(product)
  } catch (err) {
    console.error('[GET /api/products/:id] server error', err)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
