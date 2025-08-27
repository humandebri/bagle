import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function executeMigration() {
  console.log('🚀 Executing migration using Prisma...\n');
  
  try {
    const sqlPath = path.join(process.cwd(), 'supabase', 'simplify-to-time-slots-only.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements: string[] = [];
    let currentStatement = '';
    let inFunction = false;
    
    const lines = fullSql.split('\n');
    
    for (const line of lines) {
      // Track if we're inside a function definition
      if (line.includes('$$')) {
        inFunction = !inFunction;
      }
      
      currentStatement += line + '\n';
      
      // If not in function and line ends with semicolon, it's a complete statement
      if (!inFunction && line.trim().endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    console.log(`📋 Found ${statements.length} SQL statements\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`   ✅ Success`);
        successCount++;
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`   ⚠️  Already exists (skipping)`);
        } else if (error.message?.includes('does not exist')) {
          console.log(`   ⚠️  Does not exist (skipping)`);
        } else {
          console.log(`   ❌ Error: ${error.message?.substring(0, 100)}`);
          errorCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    // Test the migration
    console.log('\n🧪 Testing migration results...\n');
    
    // Check if columns exist
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'time_slots' 
      AND column_name IN ('reservation_session_id', 'reservation_expires_at')
    ` as any[];
    
    if (result.length === 2) {
      console.log('✅ time_slots table has reservation fields');
    } else {
      console.log('⚠️  time_slots table missing reservation fields');
    }
    
    // Check if functions exist
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
    
    const functionNames = functions.map((f: any) => f.routine_name);
    
    ['cleanup_expired_time_slot_reservations', 'reserve_time_slot', 'check_slot_availability', 'release_time_slot_reservation'].forEach(fname => {
      if (functionNames.includes(fname)) {
        console.log(`✅ Function ${fname} exists`);
      } else {
        console.log(`⚠️  Function ${fname} not found`);
      }
    });
    
    console.log('\n✨ Migration complete!');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

executeMigration();