import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // 認証チェックしないならここを省略
  const { items, dispatch_date, dispatch_time, user_id } = await req.json();

  if (!user_id || !items?.length) {
    return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 });
  }

  const total_price =
    items.reduce((s: number, i: any) => s + i.price * i.quantity, 0) + 10;

  const { error } = await supabaseAdmin.from('orders').insert({
    user_id,
    items,
    dispatch_date,
    dispatch_time,
    total_price,
    shipped: false,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: '保存失敗' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
