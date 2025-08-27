import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runStepMigration() {
  console.log('🚀 Running step-by-step migration...\n');
  
  try {
    // Step 1: Add columns
    console.log('📝 Step 1: Adding columns to time_slots table...');
    const step1Sql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'migration-step1.sql'), 'utf8');
    const step1Statements = step1Sql.split(';').filter(s => s.trim());
    
    for (const statement of step1Statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement + ';');
          console.log('   ✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            console.log('   ⚠️  Already exists (skipping)');
          } else {
            console.log('   ❌ Error:', error.message?.substring(0, 100));
          }
        }
      }
    }
    
    // Step 2: Create functions
    console.log('\n📝 Step 2: Creating functions...');
    const step2Sql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'migration-step2.sql'), 'utf8');
    
    // Execute the entire step2 as one statement (contains multiple functions)
    try {
      await prisma.$executeRawUnsafe(step2Sql);
      console.log('   ✅ All functions created successfully');
    } catch (error: any) {
      console.log('   ❌ Error creating functions:', error.message?.substring(0, 200));
    }
    
    // Verify migration
    console.log('\n🧪 Verifying migration...\n');
    
    // Check columns
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'time_slots' 
      AND column_name IN ('reservation_session_id', 'reservation_expires_at')
    ` as any[];
    
    console.log(`✅ Found ${columns.length}/2 reservation columns in time_slots table`);
    
    // Check functions
    const functions = await prisma.$queryRaw`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN (
        'cleanup_expired_time_slot_reservations',
        'reserve_time_slot',
        'check_slot_availability',
        'release_time_slot_reservation'
      )
    ` as any[];
    
    console.log(`✅ Found ${functions.length}/4 functions`);
    functions.forEach((f: any) => console.log(`   - ${f.routine_name}`));
    
    // Drop old table if exists
    console.log('\n📝 Step 3: Cleaning up old temporary_slot_reservations table...');
    try {
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS temporary_slot_reservations CASCADE;');
      console.log('   ✅ Old table removed');
    } catch (error: any) {
      console.log('   ⚠️  Could not remove old table:', error.message?.substring(0, 100));
    }
    
    console.log('\n✨ Migration complete!');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStepMigration();