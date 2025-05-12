import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    let q = supabase
      .from('orders')
      .select('id, user_id, total_price, created_at');
    if (from && to) q = q.gte('created_at', from).lte('created_at', to);

    const { data, error } = await q;
    if (error) throw error;
    const orders = data ?? [];

    // 売上合計
    const totalSales = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    // 注文数
    const orderCount = orders.length;
    // ユーザーごとに集計
    const userOrderMap = new Map();
    for (const o of orders) {
      if (!userOrderMap.has(o.user_id)) userOrderMap.set(o.user_id, 0);
      userOrderMap.set(o.user_id, userOrderMap.get(o.user_id) + 1);
    }
    // 新規顧客数（この期間で初めて注文したユーザー）
    const newCustomers = Array.from(userOrderMap.values()).filter(v => v === 1).length;
    // リピーター数（2回以上注文したユーザー）
    const repeatCustomers = Array.from(userOrderMap.values()).filter(v => v > 1).length;
    // 平均注文額
    const aov = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

    return NextResponse.json({
      totalSales,
      orderCount,
      newCustomers,
      repeatCustomers,
      aov,
    });
  } catch (err) {
    console.error('KPI取得エラー:', err);
    return NextResponse.json({ error: 'KPIの取得に失敗しました' }, { status: 500 });
  }
} 