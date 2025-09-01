import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server-api';

// GET /api/business-calendar
// 公開API - 営業日情報を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      // パラメータがない場合は現在月のデータを返す
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const supabase = await createServerSupabaseClient();
      const { data: days, error } = await supabase
        .from('business_days')
        .select('date, is_open, is_special, notes')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) {
        console.error('Error fetching business days:', error);
        return NextResponse.json({ days: [] });
      }

      return NextResponse.json({ days: days || [] });
    }

    const supabase = await createServerSupabaseClient();
    const { data: days, error } = await supabase
      .from('business_days')
      .select('date, is_open, is_special, notes')
      .gte('date', start)
      .lte('date', end)
      .order('date');

    if (error) {
      console.error('Error fetching business days:', error);
      return NextResponse.json({ days: [] });
    }

    // 指定期間にレコードが無い日付は「休業日」として補完して返す
    const result = fillMissingDaysWithClosed(days || [], start, end);
    return NextResponse.json({ days: result });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ days: [] });
  }
}

// 補助: 期間内でDB未登録の日付を休業日として補完
function fillMissingDaysWithClosed(
  days: Array<{ date: string; is_open: boolean; is_special?: boolean | null; notes?: string | null }>,
  start: string,
  end: string
) {
  const map = new Map<string, { date: string; is_open: boolean; is_special?: boolean | null; notes?: string | null }>();
  for (const d of days) {
    map.set(d.date, { date: d.date, is_open: d.is_open, is_special: !!d.is_special, notes: d.notes ?? null });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
    const iso = new Date(dt).toISOString().split('T')[0];
    if (!map.has(iso)) {
      map.set(iso, { date: iso, is_open: false, is_special: false, notes: null });
    }
  }

  // ソートして配列化
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
