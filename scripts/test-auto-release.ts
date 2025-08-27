import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAutoRelease() {
  console.log('🧪 15分自動解放のテスト\n');
  console.log('='.repeat(50));
  
  try {
    // テスト用の日付（7日後）
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const dateStr = testDate.toISOString().split('T')[0];
    
    // 1. テスト用のスロットを作成
    console.log('\n📅 テストスロット作成');
    await supabase.from('time_slots').upsert({
      date: dateStr,
      time: '15:00:00',
      max_capacity: 3,
      current_bookings: 0,
      is_available: true
    });
    console.log(`✅ ${dateStr} 15:00 - 最大3枠`);
    
    // 2. 3人分の仮予約を作成（異なる時刻）
    console.log('\n⏰ 仮予約を作成（各15分で期限切れ）');
    
    const users = [
      { id: 'user_A', delay: 0 },
      { id: 'user_B', delay: 2 },  // 2分後
      { id: 'user_C', delay: 5 },  // 5分後
    ];
    
    for (const user of users) {
      if (user.delay > 0) {
        console.log(`⏳ ${user.delay}分待機...`);
        await new Promise(resolve => setTimeout(resolve, user.delay * 1000)); // デモ用に秒単位
      }
      
      const { data, error } = await supabase.rpc('reserve_time_slot', {
        p_date: dateStr,
        p_time: '15:00',
        p_session_id: user.id
      });
      
      if (!error && data?.success) {
        const expiresAt = new Date(data.expires_at);
        console.log(`✅ ${user.id}: 予約成功 → 期限: ${expiresAt.toLocaleTimeString('ja-JP')}`);
      } else {
        console.log(`❌ ${user.id}: ${data?.message || error?.message}`);
      }
    }
    
    // 3. 現在の状態を確認
    console.log('\n📊 現在の予約状態');
    const { data: currentReservations } = await supabase
      .from('slot_reservations')
      .select('*')
      .eq('date', dateStr)
      .eq('time', '15:00:00')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at');
    
    if (currentReservations && currentReservations.length > 0) {
      console.log(`有効な仮予約: ${currentReservations.length}件`);
      currentReservations.forEach(res => {
        const expires = new Date(res.expires_at);
        const now = new Date();
        const remainingMinutes = Math.round((expires.getTime() - now.getTime()) / 1000 / 60);
        console.log(`  - ${res.session_id}: あと${remainingMinutes}分で期限切れ`);
      });
    }
    
    // 4. 期限切れの仮予約を手動でクリーンアップ（デモ用）
    console.log('\n🧹 期限切れチェック機能のテスト');
    
    // 過去の期限切れデータを作成
    await supabase.from('slot_reservations').insert({
      session_id: 'expired_user',
      date: dateStr,
      time: '15:00:00',
      expires_at: new Date(Date.now() - 60 * 1000).toISOString() // 1分前に期限切れ
    });
    console.log('✅ 期限切れデータを追加');
    
    // クリーンアップ関数を実行
    const { error: cleanupError } = await supabase.rpc('cleanup_expired_reservations');
    if (!cleanupError) {
      console.log('✅ cleanup_expired_reservations()を実行');
    }
    
    // 再度確認
    const { data: afterCleanup } = await supabase
      .from('slot_reservations')
      .select('*')
      .eq('date', dateStr)
      .eq('time', '15:00:00');
    
    console.log(`\n📊 クリーンアップ後の状態`);
    console.log(`残っている予約: ${afterCleanup?.length || 0}件`);
    if (afterCleanup && afterCleanup.length > 0) {
      afterCleanup.forEach(res => {
        const expires = new Date(res.expires_at);
        const isExpired = expires < new Date();
        console.log(`  - ${res.session_id}: ${isExpired ? '期限切れ❌' : '有効✅'}`);
      });
    }
    
    // 5. 自動解放の仕組みを説明
    console.log('\n' + '='.repeat(50));
    console.log('💡 自動解放の仕組み：\n');
    console.log('1️⃣ reserve_time_slot()が呼ばれるたびに cleanup_expired_reservations()を実行');
    console.log('2️⃣ check_slot_availability()が呼ばれるたびにも実行');
    console.log('3️⃣ validate-time-slot APIが呼ばれるたびにも実行');
    console.log('4️⃣ 各関数の最初で期限切れ（expires_at < NOW()）を自動削除');
    console.log('5️⃣ ユーザーがページを開くたびに古い予約が削除される');
    
    console.log('\n⚠️  注意：');
    console.log('- cronジョブは不要（ユーザーアクセス時に自動実行）');
    console.log('- 各ユーザーの15分タイマーは独立');
    console.log('- データベースの NOW() 関数でサーバー時刻を使用');
    
    // クリーンアップ
    await supabase
      .from('slot_reservations')
      .delete()
      .eq('date', dateStr)
      .like('session_id', 'user_%');
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testAutoRelease();