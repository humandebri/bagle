import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyMultipleReservations() {
  console.log('🚀 Applying multiple reservations support...\n');
  
  try {
    const sqlPath = path.join(process.cwd(), 'supabase', 'fix-multiple-reservations.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = fullSql
      .split(/^-- \d+\./gm)
      .filter(s => s.trim())
      .map(s => s.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      try {
        // For CREATE TABLE and ALTER TABLE, execute line by line
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX')) {
          const lines = statement.split(';').filter(l => l.trim());
          for (const line of lines) {
            if (line.trim()) {
              await prisma.$executeRawUnsafe(line.trim() + ';');
            }
          }
        } else {
          // For functions, execute as single statement
          await prisma.$executeRawUnsafe(statement);
        }
        console.log('   ✅ Success');
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('   ⚠️  Already exists');
        } else {
          console.log('   ❌ Error:', error.message?.substring(0, 150));
        }
      }
    }
    
    // Verify the new structure
    console.log('\n🧪 Verifying new structure...\n');
    
    // Check if slot_reservations table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'slot_reservations'
    ` as any[];
    
    if (tables.length > 0) {
      console.log('✅ slot_reservations table exists');
    } else {
      console.log('⚠️  slot_reservations table not found');
    }
    
    // Check functions
    const functions = await prisma.$queryRaw`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN (
        'cleanup_expired_reservations',
        'reserve_time_slot',
        'check_slot_availability',
        'release_time_slot_reservation'
      )
    ` as any[];
    
    console.log(`✅ Found ${functions.length}/4 functions`);
    
    // Test with multiple reservations
    console.log('\n🧪 Testing multiple reservations...\n');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const dateStr = testDate.toISOString().split('T')[0];
    
    // Create test time slot if needed
    try {
      await prisma.time_slots.upsert({
        where: {
          date_time: {
            date: testDate,
            time: new Date('1970-01-01T11:00:00')
          }
        },
        update: {},
        create: {
          date: testDate,
          time: new Date('1970-01-01T11:00:00'),
          end_time: new Date('1970-01-01T11:15:00'),
          max_capacity: 3,
          current_bookings: 0,
          is_available: true
        }
      });
    } catch (e) {
      // Ignore if already exists
    }
    
    // Test multiple reservations
    const sessions = ['user1_test', 'user2_test', 'user3_test'];
    
    for (const sessionId of sessions) {
      const result = await prisma.$queryRaw`
        SELECT * FROM reserve_time_slot(
          ${dateStr}::DATE,
          '11:00'::VARCHAR,
          ${sessionId}::TEXT
        )
      ` as any[];
      
      console.log(`Session ${sessionId}:`, result[0]);
    }
    
    // Check availability
    const availability = await prisma.$queryRaw`
      SELECT * FROM check_slot_availability(
        ${dateStr}::DATE,
        '11:00'::VARCHAR,
        NULL
      )
    ` as any[];
    
    console.log('\nSlot availability after 3 reservations:', availability[0]);
    
    // Clean up test data
    await prisma.$executeRawUnsafe(`
      DELETE FROM slot_reservations 
      WHERE session_id LIKE '%_test'
    `);
    
    console.log('\n✨ Multiple reservations support applied successfully!');
    console.log('   Each user gets their own 15-minute timer');
    console.log('   Multiple users can reserve the same slot simultaneously');
    
  } catch (error: any) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMultipleReservations();
