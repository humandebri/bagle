import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { normalizeSlotCategory } from '@/lib/categories';
import { isTimeRangeWithinCategory } from '@/lib/slot-rules';

export async function POST(request: Request) {
  try {
    const { date, time, isUserSelection } = await request.json();

    console.log('[validate-time-slot] Validating:', { date, time, isUserSelection });

    if (!date || !time) {
      return NextResponse.json({ 
        valid: false, 
        message: '日付と時間を選択してください' 
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // 現在の日時を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60 * 1000);
    
    // 選択された日時を日本時間として解析
    const selectedDateTime = new Date(`${date}T${time}+09:00`);
    
    // 過去の日時かチェック
    if (selectedDateTime <= jstNow) {
      return NextResponse.json({ 
        valid: false, 
        message: '過去の日時は選択できません。新しい日時を選択してください。' 
      });
    }
    
    // 予約開始制限のチェック（7日前の同じ曜日0時から予約可能）
    const slotDate = new Date(date + 'T00:00:00+09:00');
    const bookingStartDate = new Date(slotDate);
    bookingStartDate.setDate(bookingStartDate.getDate() - 7);
    bookingStartDate.setHours(0, 0, 0, 0);
    
    if (jstNow < bookingStartDate) {
      return NextResponse.json({ 
        valid: false, 
        message: 'この日付の予約はまだ開始されていません。予約は1週間前の同じ曜日0時から開始されます。' 
      });
    }
    
    // time_slotsテーブルから該当スロットを取得
    // データベースには "11:00:00" 形式で8文字で保存されている
    // ユーザーからは "11:00" 形式で5文字で送られてくる
    const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
    
    const { data: slot, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('date', date)
      .eq('time', timeWithSeconds)
      .single();
      
    if (error || !slot) {
      console.log('[validate-time-slot] Slot not found:', { date, timeWithSeconds, error });
      return NextResponse.json({ 
        valid: false, 
        message: 'この時間枠は利用できません。別の時間枠を選択してください。' 
      });
    }

    console.log('[validate-time-slot] Slot found:', { 
      date: slot.date,
      time: slot.time,
      end_time: slot.end_time,
      is_available: slot.is_available,
      max_capacity: slot.max_capacity,
      current_bookings: slot.current_bookings
    });

    const slotCategory = normalizeSlotCategory(slot.allowed_category);
    if (
      !isTimeRangeWithinCategory(
        slotCategory,
        slot.time.slice(0, 5),
        slot.end_time.slice(0, 5),
      )
    ) {
      return NextResponse.json({
        valid: false,
        message: 'このカテゴリでは選択した時間枠を利用できません。',
      });
    }
    
    // 満員チェック（current_bookings >= max_capacity）
    if (slot.current_bookings >= slot.max_capacity) {
      console.log('[validate-time-slot] Slot is full');
      // ユーザーが明示的に選択した場合は、後続の処理で既存予約や仮予約をチェック
      if (!isUserSelection) {
        return NextResponse.json({ 
          valid: false, 
          message: 'この時間枠は満員です。別の時間枠を選択してください。' 
        });
      }
    }
    
    // 現在のユーザーセッションを取得
    const session = await getServerSession(authOptions);
    
    // ユーザーが既にこの時間枠に予約を持っているかチェック
    let userHasExistingBooking = false;
    if (session?.user?.email) {
      // ordersテーブルの dispatch_time は "12:00" 形式で5文字で保存されている
      const timeForComparison = time.slice(0, 5); // 常に5文字に変換
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_email', session.user.email)
        .eq('dispatch_date', date)
        .eq('dispatch_time', timeForComparison)
        .neq('payment_status', 'cancelled') // キャンセル済みは除外
        .single();
      
      userHasExistingBooking = !!existingOrders;
    }
    
    // ユーザーが既に予約を持っている場合は、満員でも有効とする
    if (userHasExistingBooking) {
      console.log('[validate-time-slot] User has existing booking');
      return NextResponse.json({ 
        valid: true, 
        message: '既存の予約時間枠です',
        existingBooking: true
      });
    }
    
    // セッションIDを取得（仮予約確認用）
    let sessionId = session?.user?.email || '';
    if (!sessionId && typeof window === 'undefined') {
      // サーバーサイドでCookieから取得
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      sessionId = cookieStore.get('temp_session_id')?.value || '';
    }
    
    // 新しいcheck_slot_availability関数を使用（フォールバック付き）
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('check_slot_availability', {
        p_date: date,
        p_time: time,
        p_session_id: sessionId || null
      });
    
    if (availabilityError) {
      // 新しい関数が存在しない場合は旧方式にフォールバック
      console.log('[validate-time-slot] New function not found, using fallback');
      
      const { data: availableCapacity } = await supabase
        .rpc('get_available_capacity', {
          p_date: date,
          p_time: time,
          p_session_id: sessionId
        });
      
      const remainingCapacity = availableCapacity || 0;
      
      if (remainingCapacity <= 0) {
        // ユーザーが既に仮予約を持っている場合は有効とする
        if (isUserSelection || sessionId) {
          const { data: hasReservation } = await supabase
            .from('temporary_slot_reservations')
            .select('id')
            .eq('session_id', sessionId)
            .eq('date', date)
            .eq('time', timeWithSeconds)
            .gte('expires_at', new Date().toISOString())
            .single();
          
          if (hasReservation) {
            return NextResponse.json({ 
              valid: true, 
              message: '選択済みの時間枠です',
              isFull: true,
              remainingCapacity: 0
            });
          }
        }
        
        return NextResponse.json({ 
          valid: false, 
          message: 'この時間枠は満員です。別の時間枠を選択してください。' 
        });
      }
      
      return NextResponse.json({ 
        valid: true, 
        message: '時間枠は利用可能です',
        remainingCapacity 
      });
    }
    
    // 新方式のレスポンスを処理
    const isAvailable = availabilityData?.available || false;
    const capacity = availabilityData?.capacity || 0;
    const isReservedByMe = availabilityData?.is_reserved_by_me || false;
    
    // ユーザーの選択時またはユーザーが既に予約を持っている場合は有効とする
    if ((isUserSelection || isReservedByMe) && !isAvailable) {
      return NextResponse.json({ 
        valid: true, 
        message: isReservedByMe ? '選択済みの時間枠です' : '時間枠を予約中です',
        isFull: capacity <= 0,
        remainingCapacity: 0
      });
    }
    
    if (!isAvailable) {
      return NextResponse.json({ 
        valid: false, 
        message: availabilityData?.message || 'この時間枠は満員です。別の時間枠を選択してください。' 
      });
    }
    
    return NextResponse.json({ 
      valid: true, 
      message: availabilityData?.message || '時間枠は利用可能です',
      remainingCapacity: capacity
    });
    
  } catch (error) {
    console.error('Time slot validation error:', error);
    return NextResponse.json({ 
      valid: false, 
      message: 'エラーが発生しました。もう一度お試しください。' 
    }, { status: 500 });
  }
}
