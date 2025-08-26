// import { createServerSupabaseClient } from './supabase-server';

// /**
//  * 木曜・土曜のみ、指定した日数分の予約枠を生成し投入するスクリプト
//  */
// const TIME_SLOTS = [
//   { time: '11:00', max_capacity: 1 },
//   { time: '11:15', max_capacity: 1 },
//   { time: '11:30', max_capacity: 1 },
//   { time: '11:45', max_capacity: 1 },
//   { time: '12:00', max_capacity: 4 },
//   { time: '13:00', max_capacity: 3 },
//   { time: '14:00', max_capacity: 3 },
// ];

// const DAYS_AHEAD = 14; // 2週間分投入

// function getNextNDays(dayOfWeeks: number[], n: number): string[] {
//   const result: string[] = [];
//   const today = new Date();
//   for (let i = 0; result.length < n * dayOfWeeks.length; i++) {
//     const d = new Date(today);
//     d.setDate(today.getDate() + i);
//     if (dayOfWeeks.includes(d.getDay())) {
//       result.push(d.toISOString().split('T')[0]);
//     }
//   }
//   return result;
// }

// export async function seedTimeSlots() {
//   const supabase = await createServerSupabaseClient();
  
//   // 現在の日付から2週間分の予約枠を作成
//   const today = new Date();
//   const twoWeeksLater = new Date();
//   twoWeeksLater.setDate(today.getDate() + 14);

//   const slots = [];
//   for (let d = new Date(today); d <= oneWeekLater; d.setDate(d.getDate() + 1)) {
//     // 木曜日（4）と土曜日（6）のみ
//     if (d.getDay() === 4 || d.getDay() === 6) {
//       for (const slot of TIME_SLOTS) {
//         slots.push({
//           date: d.toISOString().split('T')[0],
//           time: slot.time,
//           max_capacity: slot.max_capacity,
//           current_bookings: 0,
//           is_available: true
//         });
//       }
//     }
//   }

//   const { error } = await supabase
//     .from('time_slots')
//     .upsert(slots, { onConflict: 'date,time' });

//   if (error) {
//     console.error('Error seeding time slots:', error);
//     throw error;
//   }
// }
import 'dotenv/config'; // ✅ これがないと .env は反映されません
import { supabaseAdmin } from './supabase-admin';



const TIME_SLOTS = [
  { time: '11:00', max_capacity: 1 },
  { time: '11:15', max_capacity: 1 },
  { time: '11:30', max_capacity: 1 },
  { time: '11:45', max_capacity: 1 },
  { time: '12:00', max_capacity: 8 },  // 12:00-15:00の枠として8人
];

const DAYS_AHEAD = 7; // 1週間分のスロットを生成

async function seedTimeSlots() {
  const today = new Date();
  const oneWeekLater = new Date();
  oneWeekLater.setDate(today.getDate() + DAYS_AHEAD);

  const slots = [];

  for (let d = new Date(today); d <= oneWeekLater; d.setDate(d.getDate() + 1)) {
    if ([4, 6].includes(d.getDay())) {
      for (const slot of TIME_SLOTS) {
        slots.push({
          date: d.toISOString().split('T')[0],
          time: slot.time,
          max_capacity: slot.max_capacity,
          current_bookings: 0,
          is_available: true,
        });
      }
    }
  }

  // 既存のデータをクリア（今日以降のデータを削除）
  const { error: deleteError } = await supabaseAdmin
    .from('time_slots')
    .delete()
    .gte('date', today.toISOString().split('T')[0]);
  
  if (deleteError) {
    console.error('Error deleting existing time slots:', deleteError);
    return;
  }
  
  console.log('✅ Cleared existing time slots');

  // 新しいデータを挿入
  const { error } = await supabaseAdmin
    .from('time_slots')
    .upsert(slots, { onConflict: 'date,time' });

  if (error) {
    console.error('Error seeding time slots:', error);
  } else {
    console.log(`✅ Inserted ${slots.length} time slots`);
  }
}

seedTimeSlots();
