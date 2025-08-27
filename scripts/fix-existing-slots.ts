import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingSlots() {
  console.log('🔧 Fixing existing time slots...\n');
  
  try {
    // 既存のスロットを取得
    const existingSlots = await prisma.time_slots.findMany();
    
    console.log(`Found ${existingSlots.length} existing slots`);
    
    // is_availableがfalseのものを修正
    const unavailableSlots = existingSlots.filter(s => !s.is_available);
    
    if (unavailableSlots.length > 0) {
      console.log(`\nFixing ${unavailableSlots.length} unavailable slots...`);
      
      for (const slot of unavailableSlots) {
        await prisma.time_slots.update({
          where: {
            id: slot.id
          },
          data: {
            is_available: true
          }
        });
        
        console.log(`  ✅ Fixed: ${slot.date.toISOString().split('T')[0]} ${slot.time.toISOString().split('T')[1].slice(0, 8)}`);
      }
    }
    
    // 時間フォーマットが異常なものを確認
    console.log('\nChecking time formats...');
    
    for (const slot of existingSlots) {
      const timeStr = slot.time.toISOString().split('T')[1].slice(0, 8);
      const hour = parseInt(timeStr.split(':')[0]);
      
      // 時間が0-23の範囲外の場合は問題
      if (hour < 0 || hour > 23) {
        console.log(`  ⚠️  Unusual time: ${slot.date.toISOString().split('T')[0]} ${timeStr} (hour: ${hour})`);
      }
    }
    
    // current_bookingsをすべて0にリセット
    console.log('\nResetting current_bookings to 0...');
    await prisma.$executeRawUnsafe(`
      UPDATE time_slots SET current_bookings = 0
    `);
    console.log('✅ Reset all current_bookings');
    
    // 結果を確認
    const fixed = await prisma.time_slots.findMany({
      orderBy: [
        { date: 'desc' },
        { time: 'asc' }
      ],
      take: 10
    });
    
    console.log('\nFixed slots (latest 10):');
    fixed.forEach(slot => {
      console.log(`  ${slot.date.toISOString().split('T')[0]} ${slot.time.toISOString().split('T')[1].slice(0, 8)} - Capacity: ${slot.max_capacity}, Available: ${slot.is_available}`);
    });
    
    console.log('\n✨ Fix complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingSlots();