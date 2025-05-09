import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next'; // ★ これを追加
import { authOptions } from '@/app/lib/auth';

export const runtime = 'nodejs';

// Service Role クライアント（管理専用・絶対にブラウザに渡さない）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 管理者専用の商品一覧取得
export async function GET() {
  // 認証チェック（NextAuth.js）
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '管理者のみアクセス可能です' }, { status: 401 });
  }

  // Supabaseからデータ取得
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      category:categories(*),
      tags:product_tags(tag:tags(*))
    `)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('商品取得エラー:', error);
    return NextResponse.json({ error: '商品取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(products);
}
