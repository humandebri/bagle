import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    // URLパラメータから日付を取得
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付が指定されていません' }, { status: 400 });
    }

    // 指定された日付の注文を取得
  const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        created_at,
        items,
        dispatch_date,
        dispatch_time,
        dispatch_end_time,
        total_price,
        shipped,
        payment_status
      `)
      .eq('dispatch_date', date)
      .or('payment_status.is.null,payment_status.neq.cancelled')
      .order('dispatch_time', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    // データのフォーマット（各注文に対してprofileを取得）
    const formatted = await Promise.all((data ?? []).map(async (order) => {
      const profile = await prisma.profiles.findUnique({
        where: { user_id: order.user_id },
        select: {
          first_name: true,
          last_name: true,
          phone: true
        }
      });
      
      return {
        ...order,
        customer_name: profile ? `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() : null,
        phone: profile?.phone ?? null,
      };
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error) {
    console.error('予約データの取得に失敗:', error);
    return NextResponse.json(
      { error: '予約データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
