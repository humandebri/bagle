/* ---------------------------------------------------------------- *
 *  API – /api/admin/orders
 *  runtime: Node.js   (Supabase JS は Edge 不可)
 * ---------------------------------------------------------------- */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';   // ★ ここを追加
import { authOptions } from '@/app/lib/auth';        // 設定オブジェクト
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'nodejs';

/* --- Supabase admin client -------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service‑role key
  { auth: { persistSession: false } }
);

/* --- Zod スキーマ ---------------------------------------------- */
const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  dispatchDate: z.string().length(10),  // 'YYYY-MM-DD'
  dispatchTime: z.string().min(4),      // '11:00'
  items: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      price: z.number().int().nonnegative(),
      quantity: z.number().int().positive(),
    })
  ),
});

/* ================================================================ */
/*  GET – 一覧取得                                                  */
/* ================================================================ */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions); // ★ 修正点
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('startDate');
  const end   = searchParams.get('endDate');
  const st    = searchParams.get('status');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const order = searchParams.get('order');
  const id = searchParams.get('id');

  try {
    let q = supabase
      .from('orders')
      .select(`
        id,user_id,created_at,items,dispatch_date,dispatch_time,total_price,
        payment_status, profiles(first_name,last_name,phone), shipped
      `)
      .order('created_at', { ascending: order !== 'desc' });

    if (id) q = q.eq('id', id);

    if (start && end) q = q.gte('dispatch_date', start).lte('dispatch_date', end);
    if (st)           q = q.eq('payment_status', st);
    if (limit)        q = q.limit(Number(limit));
    if (offset)       q = q.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (id) {
      const { data, error } = await q.single();
      if (error) throw error;
      const o = data;
      const p = Array.isArray(o.profiles)
        ? o.profiles[0] ?? null
        : (o.profiles as {
            first_name: string | null;
            last_name: string | null;
            phone: string | null;
          } | null);
      const formatted = {
        ...o,
        status: o.payment_status,
        customer_name: p ? `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() : null,
        phone: p?.phone ?? null,
      };
      return NextResponse.json(formatted);
    } else {
      const { data, error } = await q;
      if (error) throw error;
      const formatted = (data ?? []).map((o) => {
        const p = Array.isArray(o.profiles)
          ? o.profiles[0] ?? null
          : (o.profiles as {
              first_name: string | null;
              last_name: string | null;
              phone: string | null;
            } | null);
        return {
          ...o,
          status: o.payment_status,
          customer_name: p ? `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() : null,
          phone: p?.phone ?? null,
        };
      });
      return NextResponse.json(formatted);
    }
  } catch (err) {
    console.error('予約取得エラー:', err);
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 });
  }
}

/* ================================================================ */
/*  PUT – 予約更新                                                  */
/* ================================================================ */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions); // ★ 修正点
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id, status, dispatchDate, dispatchTime, items } =
      updateSchema.parse(await req.json());

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: status,
        dispatch_date:  dispatchDate,
        dispatch_time:  dispatchTime,
        items,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('予約更新エラー:', err);
    return NextResponse.json({ error: '予約の更新に失敗しました' }, { status: 500 });
  }
}

/* ================================================================ */
/*  DELETE – 予約削除                                               */
/* ================================================================ */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions); // ★ 修正点
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 });
    }

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: '予約を削除しました' });
  } catch (err) {
    console.error('予約削除エラー:', err);
    return NextResponse.json({ error: '予約の削除に失敗しました' }, { status: 500 });
  }
}
