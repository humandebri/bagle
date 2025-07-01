import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'カテゴリーデータの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}