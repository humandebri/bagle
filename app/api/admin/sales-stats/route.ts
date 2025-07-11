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
  const period = searchParams.get('period') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    let q = supabase
      .from('orders')
      .select('id, total_price, created_at, payment_status')
      .neq('payment_status', 'cancelled');
    if (from && to) q = q.gte('created_at', from).lte('created_at', to);
    const { data, error } = await q;
    if (error) throw error;
    const orders = data ?? [];

    // 日付ごと or 月ごとに集計
    const groupKey = (d: string) => {
      const date = new Date(d);
      if (period === 'monthly') {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        return date.toISOString().slice(0, 10);
      }
    };
    const stats: Record<string, { totalSales: number; orderCount: number }> = {};
    for (const o of orders) {
      const key = groupKey(o.created_at);
      if (!stats[key]) stats[key] = { totalSales: 0, orderCount: 0 };
      stats[key].totalSales += o.total_price || 0;
      stats[key].orderCount += 1;
    }
    // 日付順にソートして配列化
    const result = Object.entries(stats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('売上集計エラー:', err);
    return NextResponse.json({ error: '売上集計に失敗しました' }, { status: 500 });
  }
} 