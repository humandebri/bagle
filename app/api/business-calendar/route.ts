import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server-api';
import { generateDateRange, generateBusinessDayInfo } from './utils';

// GET /api/business-calendar
// 公開API - 営業日情報を取得（定期休業日パターンも適用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let start = searchParams.get('start');
    let end = searchParams.get('end');

    if (!start || !end) {
      // パラメータがない場合は現在月のデータを返す
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      start = new Date(year, month, 1).toISOString().split('T')[0];
      end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    }

    const supabase = await createServerSupabaseClient();
    
    // 1. business_daysテーブルから既存のデータを取得
    const { data: days, error: daysError } = await supabase
      .from('business_days')
      .select('date, is_open, is_special, notes')
      .gte('date', start)
      .lte('date', end)
      .order('date');

    if (daysError) {
      console.error('Error fetching business days:', daysError);
      return NextResponse.json({ days: [] });
    }

    // 2. business_hoursテーブルから営業時間を取得
    const { data: hours, error: hoursError } = await supabase
      .from('business_hours')
      .select('day_of_week, is_closed, open_time, close_time');

    if (hoursError) {
      console.error('Error fetching business hours:', hoursError);
      return NextResponse.json({ days: days || [] });
    }

    // 3. recurring_holidaysテーブルから定期休業日パターンを取得
    const { data: patterns, error: patternsError } = await supabase
      .from('recurring_holidays')
      .select('type, pattern, is_active')
      .eq('is_active', true);

    if (patternsError) {
      console.error('Error fetching recurring holidays:', patternsError);
      return NextResponse.json({ days: days || [] });
    }

    // 4. 期間内の全日付に対して営業日情報を生成
    const startDate = new Date(start);
    const endDate = new Date(end);
    const allDates = generateDateRange(startDate, endDate);
    
    // 既存のデータをMapに変換（高速検索用）
    const daysMap = new Map((days || []).map(d => [d.date, d]));
    
    // 全日付の営業日情報を生成
    const allDays = allDates.map(date => 
      generateBusinessDayInfo(date, daysMap, hours || [], patterns || [])
    );

    return NextResponse.json({ days: allDays });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ days: [] });
  }
}