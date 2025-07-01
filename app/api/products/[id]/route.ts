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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createServerSupabaseClient()
    
    // 商品が存在するか確認
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 商品を削除
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting product:', deleteError)
      return NextResponse.json(
        { error: '商品の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `商品「${product.name}」を削除しました` 
    })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
