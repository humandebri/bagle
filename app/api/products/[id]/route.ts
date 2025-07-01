import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/lib/auth'
import type { Session } from 'next-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }   // ★ Promise にする
) {
  const { id } = await params                        // ★ await で展開

  try {
    // 管理者権限チェック（管理画面からのアクセスか確認）
    const session = await getServerSession(authOptions) as Session
    const isAdmin = session && (session.user as { role?: string }).role === 'admin'

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
        category_id,
        category:categories ( id, name )
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

    // 管理者でない場合のみ、販売可能チェックを行う
    if (!isAdmin && !product.is_available) {
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    // 管理者権限チェック
    const session = await getServerSession(authOptions) as Session
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      long_description,
      price,
      image,
      is_available,
      is_limited,
      start_date,
      end_date,
      category_id
    } = body

    const supabase = await createServerSupabaseClient()
    
    // 商品が存在するか確認
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 商品を更新
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        name,
        description,
        long_description,
        price,
        image,
        is_available,
        is_limited,
        start_date: start_date || null,
        end_date: end_date || null,
        category_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json(
        { error: '商品の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: updatedProduct,
      message: '商品を更新しました' 
    })
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
