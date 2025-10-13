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
      .select('id, user_id, total_price, created_at, payment_status');
    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00.000Z`).toISOString();
      const toDate = new Date(`${to}T23:59:59.999Z`).toISOString();
      q = q.gte('created_at', fromDate).lte('created_at', toDate);
    }

    const { data, error } = await q;
    if (error) throw error;
    const orders = (data ?? []).filter((order) => order.payment_status !== 'cancelled');

    // 売上合計
    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    // 注文数
    const orderCount = orders.length;
    // ユーザーごとに集計
    const userOrderMap = new Map<string, number>();
    for (const o of orders) {
      const customerKey = o.user_id ?? `guest-${o.id}`;
      userOrderMap.set(customerKey, (userOrderMap.get(customerKey) ?? 0) + 1);
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
