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

    return NextResponse.json({ days: days || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ days: [] });
  }
}