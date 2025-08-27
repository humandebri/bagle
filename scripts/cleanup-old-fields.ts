import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldFields() {
  console.log('🧹 Cleaning up old reservation fields from time_slots...\n');
  
  try {
    // 古いカラムを削除
    console.log('Removing old reservation fields...');
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE time_slots 
        DROP COLUMN IF EXISTS reservation_session_id
      `);
      console.log('✅ Removed reservation_session_id');
    } catch (e) {
      console.log('⚠️  reservation_session_id already removed or does not exist');
    }
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE time_slots 
        DROP COLUMN IF EXISTS reservation_expires_at
      `);
      console.log('✅ Removed reservation_expires_at');
    } catch (e) {
      console.log('⚠️  reservation_expires_at already removed or does not exist');
    }
    
    // current_bookingsを0にリセット（動的計算に切り替えるため）
    console.log('\nResetting current_bookings to 0...');
    await prisma.$executeRawUnsafe(`
      UPDATE time_slots
      SET current_bookings = 0
    `);
    console.log('✅ Reset all current_bookings to 0');
    
    // 確認
    console.log('\n🧪 Verifying cleanup...\n');
    
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'time_slots' 
      AND column_name IN ('reservation_session_id', 'reservation_expires_at')
    ` as any[];
    
    if (columns.length === 0) {
      console.log('✅ Old reservation fields successfully removed');
    } else {
      console.log('⚠️  Some old fields still exist:', columns.map(c => c.column_name));
    }
    
    // slot_reservationsテーブルの確認
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'slot_reservations'
    ` as any[];
    
    if (tables.length > 0) {
      console.log('✅ slot_reservations table exists for multiple reservations');
      
      // 現在の予約数を確認
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM slot_reservations WHERE expires_at > NOW()
      ` as any[];
      
      console.log(`   Active temporary reservations: ${count[0].count}`);
    }
    
    console.log('\n✨ Cleanup complete!');
    console.log('   - time_slots table now uses dynamic booking calculation');
    console.log('   - Multiple users can reserve the same slot simultaneously');
    
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldFields();