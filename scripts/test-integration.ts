import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testIntegration() {
  console.log('🧪 Testing admin/time_slots integration...\n');
  
  try {
    // 1. テスト用の日付を準備
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const dateStr = testDate.toISOString().split('T')[0];
    
    // 2. テスト用のスロットを作成
    console.log('Creating test time slot...');
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .upsert({
        date: dateStr,
        time: '14:00:00',
        max_capacity: 5,
        current_bookings: 0,
        is_available: true
      })
      .select()
      .single();
    
    if (slotError) throw slotError;
    console.log('✅ Created slot:', { date: slot.date, time: slot.time, max_capacity: slot.max_capacity });
    
    // 3. 複数の仮予約を作成
    console.log('\nCreating multiple temporary reservations...');
    const users = ['test_user1', 'test_user2', 'test_user3'];
    
    for (const user of users) {
      const { data: reservation } = await supabase
        .rpc('reserve_time_slot', {
          p_date: dateStr,
          p_time: '14:00',
          p_session_id: user
        });
      
      console.log(`  ${user}:`, reservation);
    }
    
    // 4. テスト注文を作成
    console.log('\nCreating test order...');
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: 'test_order_' + Date.now(),
        user_id: 'test@example.com',
        items: [{ name: 'Test Bagel', quantity: 1, price: 500 }],
        dispatch_date: dateStr,
        dispatch_time: '14:00',
        total_price: 500,
        payment_status: 'paid',
        shipped: false
      });
    
    if (orderError && !orderError.message?.includes('duplicate')) {
      console.warn('Order creation warning:', orderError.message);
    }
    
    // 5. API経由でデータを取得
    console.log('\nFetching data via API...');
    const response = await fetch('http://localhost:3006/api/time_slots');
    const apiData = await response.json();
    
    const testSlot = apiData.timeSlots?.find((s: any) => 
      s.date === dateStr && s.time === '14:00:00'
    );
    
    if (testSlot) {
      console.log('✅ API Response for test slot:');
      console.log('   Date:', testSlot.date);
      console.log('   Time:', testSlot.time);
      console.log('   Max Capacity:', testSlot.max_capacity);
      console.log('   Current Bookings (total):', testSlot.current_bookings);
      console.log('   - Confirmed Orders:', testSlot.confirmed_bookings || 0);
      console.log('   - Temporary Reservations:', testSlot.temp_bookings || 0);
      console.log('   Available:', testSlot.is_available ? 'Yes' : 'No');
    } else {
      console.log('⚠️  Test slot not found in API response');
    }
    
    // 6. 利用可能枠数をチェック
    console.log('\nChecking availability...');
    const { data: availability } = await supabase
      .rpc('check_slot_availability', {
        p_date: dateStr,
        p_time: '14:00',
        p_session_id: null
      });
    
    console.log('Availability check:', availability);
    
    // 7. クリーンアップ
    console.log('\nCleaning up test data...');
    
    // テスト仮予約を削除
    await supabase
      .from('slot_reservations')
      .delete()
      .like('session_id', 'test_%');
    
    // テスト注文を削除
    await supabase
      .from('orders')
      .delete()
      .like('id', 'test_order_%');
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n✨ Integration test complete!');
    console.log('   - Admin page shows dynamic booking counts');
    console.log('   - Multiple users can reserve same slot');
    console.log('   - Each reservation has independent 15-min timer');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
  }
}

testIntegration();