import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTimeSlots() {
  console.log('🔍 Checking time_slots in database...\n');
  
  try {
    // Count total time slots
    const count = await prisma.time_slots.count();
    console.log(`Total time_slots in database: ${count}`);
    
    // Get sample data
    const samples = await prisma.time_slots.findMany({
      take: 10,
      orderBy: [
        { date: 'desc' },
        { time: 'asc' }
      ]
    });
    
    console.log('\nSample time slots:');
    samples.forEach(slot => {
      console.log(`  ${slot.date.toISOString().split('T')[0]} ${slot.time.toISOString().split('T')[1].slice(0,8)} - Capacity: ${slot.max_capacity}, Available: ${slot.is_available}`);
    });
    
    // Check for future slots
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureCount = await prisma.time_slots.count({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    console.log(`\nFuture time slots (from today): ${futureCount}`);
    
    // Check for slots in the next 2 weeks
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    const nextTwoWeeksCount = await prisma.time_slots.count({
      where: {
        date: {
          gte: today,
          lte: twoWeeksFromNow
        }
      }
    });
    
    console.log(`Time slots in next 2 weeks: ${nextTwoWeeksCount}`);
    
    // Check date format
    const rawQuery = await prisma.$queryRaw`
      SELECT date, time, max_capacity 
      FROM time_slots 
      ORDER BY date DESC, time ASC 
      LIMIT 5
    ` as any[];
    
    console.log('\nRaw database format:');
    rawQuery.forEach(row => {
      console.log(`  Date: ${row.date}, Time: ${row.time}, Capacity: ${row.max_capacity}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlots();