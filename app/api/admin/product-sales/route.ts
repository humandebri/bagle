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

type RawOrder = {
  id: string;
  dispatch_date: string | null;
  items: unknown;
  payment_status: string | null;
};

type ParsedItem = {
  id?: string;
  name?: string;
  price: number;
  quantity: number;
};

type ProductStat = {
  productId: string;
  name: string;
  totalSales: number;
  totalQuantity: number;
  ordersCount: number;
};

function parseItems(raw: unknown): ParsedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const priceValue = obj.price;
      const quantityValue = obj.quantity;
      const price = typeof priceValue === 'number' ? priceValue : Number(priceValue) || 0;
      const quantity = typeof quantityValue === 'number' ? quantityValue : Number(quantityValue) || 0;
      if (quantity <= 0) return null;

      const name = typeof obj.name === 'string' ? obj.name : undefined;
      const id = typeof obj.id === 'string' ? obj.id : undefined;

      return {
        id,
        name,
        price,
        quantity,
      } satisfies ParsedItem;
    })
    .filter((item): item is ParsedItem => !!item);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Number(limitParam) || 10) : 10;

  try {
    let q = supabase
      .from('orders')
      .select('id, dispatch_date, items, payment_status')
      .not('dispatch_date', 'is', null);

    if (from && to) {
      q = q.gte('dispatch_date', from).lte('dispatch_date', to);
    }

    const { data, error } = await q;
    if (error) throw error;

    const orders: RawOrder[] = (data ?? []).filter(
      (order): order is RawOrder => order.payment_status !== 'cancelled'
    );

    const stats = new Map<string, ProductStat>();

    for (const order of orders) {
      if (!order.dispatch_date) continue;
      const seenInOrder = new Set<string>();
      const items = parseItems(order.items);

      for (const item of items) {
        const productKey = item.id ?? `name:${item.name ?? '不明な商品'}`;
        const name = item.name ?? '不明な商品';
        const quantity = item.quantity;
        const sales = item.price * quantity;

        if (!stats.has(productKey)) {
          stats.set(productKey, {
            productId: productKey,
            name,
            totalSales: 0,
            totalQuantity: 0,
            ordersCount: 0,
          });
        }

        const stat = stats.get(productKey)!;
        stat.totalSales += sales;
        stat.totalQuantity += quantity;

        if (!seenInOrder.has(productKey)) {
          stat.ordersCount += 1;
          seenInOrder.add(productKey);
        }
      }
    }

    const result = Array.from(stats.values())
      .sort((a, b) => {
        if (b.totalSales === a.totalSales) {
          return b.totalQuantity - a.totalQuantity;
        }
        return b.totalSales - a.totalSales;
      })
      .slice(0, limit);

    return NextResponse.json(result);
  } catch (err) {
    console.error('商品別売上集計エラー:', err);
    return NextResponse.json({ error: '商品別売上の取得に失敗しました' }, { status: 500 });
  }
}
