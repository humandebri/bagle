import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTimeSlots() {
  console.log('🌱 Seeding time slots for testing...\n');
  
  try {
    // 今週の木曜と土曜から2週間分のスロットを作成
    const today = new Date();
    const slots = [];
    
    // 今日から30日間のデータを作成
    for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      
      const dayOfWeek = targetDate.getDay();
      
      // 木曜(4)と土曜(6)のみ
      if (dayOfWeek === 4 || dayOfWeek === 6) {
        const dateStr = targetDate.toISOString().split('T')[0];
        
        // 各時間帯のスロットを作成
        const timeSlots = [
          { time: '11:00:00', max_capacity: 2 },
          { time: '11:15:00', max_capacity: 2 },
          { time: '11:30:00', max_capacity: 2 },
          { time: '11:45:00', max_capacity: 2 },
          { time: '12:00:00', max_capacity: 8 },
        ];
        
        for (const ts of timeSlots) {
          slots.push({
            date: dateStr,
            time: ts.time,
            max_capacity: ts.max_capacity,
            current_bookings: 0,
            is_available: true
          });
        }
      }
    }
    
    console.log(`Creating ${slots.length} time slots...`);
    
    // バッチで挿入
    const batchSize = 10;
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      const { error } = await supabase
        .from('time_slots')
        .insert(batch);
      
      if (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error.message);
      } else {
        console.log(`✅ Batch ${i / batchSize + 1} created (${batch.length} slots)`);
      }
    }
    
    // 確認
    const { data: created, count } = await supabase
      .from('time_slots')
      .select('*', { count: 'exact' })
      .order('date', { ascending: true })
      .limit(10);
    
    console.log(`\n✨ Created ${count} total time slots`);
    
    if (created && created.length > 0) {
      console.log('\nSample slots:');
      created.forEach(slot => {
        console.log(`  ${slot.date} ${slot.time} - Capacity: ${slot.max_capacity}`);
      });
    }
    
    // APIテスト
    console.log('\nTesting API...');
    const response = await fetch('http://localhost:3006/api/time_slots');
    const apiData = await response.json();
    console.log(`API returns ${apiData.timeSlots?.length || 0} slots`);
    
    console.log('\n✅ Seeding complete! Check http://localhost:3006/admin/time_slots');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

seedTimeSlots();