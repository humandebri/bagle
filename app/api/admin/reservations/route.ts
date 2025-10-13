/* ---------------------------------------------------------------- *
 *  API – /api/admin/orders
 *  runtime: Node.js   (Supabase JS は Edge 不可)
 * ---------------------------------------------------------------- */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';   // ★ ここを追加
import { authOptions } from '@/app/lib/auth';        // 設定オブジェクト
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

/* --- Supabase admin client -------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service‑role key
  { auth: { persistSession: false } }
);

const normalizeDate = (value: string) => value.split('T')[0] ?? value;

const toTimeWithSeconds = (time: string) =>
  time.length === 5 ? `${time}:00` : time;

const toHHMM = (time: string | null | undefined) => {
  if (!time) return null;
  return time.slice(0, 5);
};

type OrderWithTimes<TExtra = Record<string, unknown>> = TExtra & {
  dispatch_date: string | null;
  dispatch_time: string | null;
  dispatch_end_time?: string | null;
};

async function hydrateDispatchEndTimes<T extends OrderWithTimes>(orders: T[]): Promise<T[]> {
  const targets = orders.filter(
    (order) =>
      !order.dispatch_end_time &&
      typeof order.dispatch_date === 'string' &&
      typeof order.dispatch_time === 'string',
  );

  if (targets.length === 0) {
    return orders;
  }

  const uniqueKeys = Array.from(
    new Map(
      targets.map((order) => {
        const date = normalizeDate(order.dispatch_date!);
        const time = toHHMM(order.dispatch_time!) ?? order.dispatch_time!;
        return [`${date}|${time}`, { date, time }];
      }),
    ).entries(),
  );

  const uniqueDates = Array.from(
    new Set(uniqueKeys.map(([, { date }]) => date)),
  ).filter(Boolean) as string[];

  const uniqueTimesWithSeconds = Array.from(
    new Set(
      uniqueKeys.map(([, { time }]) => toTimeWithSeconds(time)),
    ),
  ).filter(Boolean) as string[];

  const resolved = new Map<string, string>();

  if (uniqueDates.length > 0 && uniqueTimesWithSeconds.length > 0) {
    const { data, error } = await supabase
      .from('time_slots')
      .select('date, time, end_time')
      .in('date', uniqueDates)
      .in('time', uniqueTimesWithSeconds);

    if (error) {
      console.warn('Failed to hydrate dispatch_end_time for admin orders', error);
    } else {
      (data ?? []).forEach((slot) => {
        const slotDate = slot.date as string | null;
        const slotTimeRaw = typeof slot.time === 'string'
          ? slot.time
          : slot.time instanceof Date
            ? slot.time.toISOString().slice(11, 19)
            : null;

        if (!slotDate || !slotTimeRaw || !slot.end_time) {
          return;
        }

        const key = `${slotDate}|${slotTimeRaw.slice(0, 5)}`;
        const formatted =
          typeof slot.end_time === 'string'
            ? slot.end_time.slice(0, 5)
            : new Date(slot.end_time).toISOString().slice(11, 16);
        resolved.set(key, formatted);
      });
    }
  }

  return orders.map((order) => {
    if (order.dispatch_end_time || !order.dispatch_date || !order.dispatch_time) {
      return order;
    }

    const date = normalizeDate(order.dispatch_date);
    const time = toHHMM(order.dispatch_time) ?? order.dispatch_time;
    const resolvedEnd = resolved.get(`${date}|${time}`);

    if (!resolvedEnd) {
      return order;
    }

    return {
      ...order,
      dispatch_end_time: resolvedEnd,
    } as T;
  });
}

/* --- Zod スキーマ ---------------------------------------------- */
const updateSchema = z.object({
  id: z.string().uuid(),
  dispatchDate: z.string().length(10),  // 'YYYY-MM-DD'
  dispatchTime: z.string().min(4),      // '11:00'
  dispatchEndTime: z.string().min(4).optional(),
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
        id,user_id,created_at,items,dispatch_date,dispatch_time,dispatch_end_time,total_price,
        shipped, payment_status
      `)
      .order('created_at', { ascending: order !== 'desc' });

    if (id) q = q.eq('id', id);

    if (start && end) q = q.gte('dispatch_date', start).lte('dispatch_date', end);
    if (st && st === 'shipped') q = q.eq('shipped', true);
    if (st && st === 'unshipped') q = q.eq('shipped', false);
    if (limit)        q = q.limit(Number(limit));
    if (offset)       q = q.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (id) {
      const { data, error } = await q.single();
      if (error) throw error;
      const o = data;
      
      // Prismaでprofileを取得
      const profile = await prisma.profiles.findUnique({
        where: { user_id: o.user_id },
        select: {
          first_name: true,
          last_name: true,
          phone: true
        }
      });
      
      const formatted = {
        ...o,
        customer_name: profile ? `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() : null,
        phone: profile?.phone ?? null,
      };
      const [hydrated] = await hydrateDispatchEndTimes([formatted]);
      return NextResponse.json(hydrated ?? formatted);
    } else {
      const { data, error } = await q;
      if (error) throw error;
      
      // 各注文に対してprofileを取得
      const formatted = await Promise.all((data ?? []).map(async (o) => {
        const profile = await prisma.profiles.findUnique({
          where: { user_id: o.user_id },
          select: {
            first_name: true,
            last_name: true,
            phone: true
          }
        });
        
        return {
          ...o,
          customer_name: profile ? `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() : null,
          phone: profile?.phone ?? null,
        };
      }));

      const hydrated = await hydrateDispatchEndTimes(formatted);
      return NextResponse.json(hydrated);
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
    const { id, dispatchDate, dispatchTime, dispatchEndTime, items } =
      updateSchema.parse(await req.json());

    let nextDispatchEndTime = dispatchEndTime ?? null;

    if (dispatchDate && dispatchTime) {
      const { data: slotEnd, error: slotEndError } = await supabase
        .from('time_slots')
        .select('end_time')
        .eq('date', dispatchDate)
        .eq('time', dispatchTime.length === 5 ? `${dispatchTime}:00` : dispatchTime)
        .maybeSingle();

      if (slotEndError) {
        console.warn('Failed to fetch slot end_time for admin update:', slotEndError);
      }

      if (slotEnd?.end_time) {
        nextDispatchEndTime = typeof slotEnd.end_time === 'string'
          ? slotEnd.end_time.slice(0, 5)
          : new Date(slotEnd.end_time).toISOString().slice(11, 16);
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        dispatch_date:  dispatchDate,
        dispatch_time:  dispatchTime,
        dispatch_end_time: nextDispatchEndTime,
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
