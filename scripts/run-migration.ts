import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration to simplified time slots system...\n');
  
  try {
    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'supabase', 'simplify-to-time-slots-only.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Parse SQL statements (split by semicolon but handle functions correctly)
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuoteTag = '';
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for dollar quote tags (e.g., $$)
      const dollarMatch = trimmedLine.match(/\$(\w*)\$/);
      if (dollarMatch) {
        if (!dollarQuoteTag) {
          dollarQuoteTag = dollarMatch[0];
          inFunction = true;
        } else if (dollarQuoteTag === dollarMatch[0]) {
          dollarQuoteTag = '';
          inFunction = false;
        }
      }
      
      currentStatement += line + '\n';
      
      // If we're not in a function and line ends with semicolon, it's end of statement
      if (!inFunction && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    const errors: any[] = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      // Execute via direct SQL - using raw SQL execution
      const { data, error } = await supabase.rpc('query_db', { 
        query: statement 
      }).single();
      
      if (error) {
        // Check if it's a "function already exists" error or similar
        if (error.message?.includes('already exists') || 
            error.message?.includes('does not exist') ||
            error.code === 'PGRST202') {
          console.log(`   ⚠️  Skipped (may already exist or not applicable)`);
          skipCount++;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          errors.push({ statement: preview, error: error.message });
        }
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Failed: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(e => {
        console.log(`   - ${e.statement}`);
        console.log(`     Error: ${e.error}`);
      });
    }
    
    // Test if the new functions exist
    console.log('\n🧪 Testing new functions...\n');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const testDateStr = testDate.toISOString().split('T')[0];
    
    // Test reserve_time_slot
    const { data: reserveTest, error: reserveError } = await supabase
      .rpc('reserve_time_slot', {
        p_date: testDateStr,
        p_time: '11:00',
        p_session_id: 'test_' + Date.now()
      });
    
    if (reserveError?.code === 'PGRST202') {
      console.log('⚠️  reserve_time_slot function not found - manual migration needed');
    } else if (reserveError) {
      console.log('⚠️  reserve_time_slot error:', reserveError.message);
    } else {
      console.log('✅ reserve_time_slot function is working');
    }
    
    // Test check_slot_availability
    const { data: checkTest, error: checkError } = await supabase
      .rpc('check_slot_availability', {
        p_date: testDateStr,
        p_time: '11:00',
        p_session_id: 'test_' + Date.now()
      });
    
    if (checkError?.code === 'PGRST202') {
      console.log('⚠️  check_slot_availability function not found - manual migration needed');
    } else if (checkError) {
      console.log('⚠️  check_slot_availability error:', checkError.message);
    } else {
      console.log('✅ check_slot_availability function is working');
    }
    
    // Check if columns exist
    const { data: columns, error: columnsError } = await supabase
      .from('time_slots')
      .select('*')
      .limit(1);
    
    if (!columnsError && columns && columns.length > 0) {
      if ('reservation_session_id' in columns[0] && 'reservation_expires_at' in columns[0]) {
        console.log('✅ time_slots table has reservation fields');
      } else {
        console.log('⚠️  time_slots table missing reservation fields - manual migration needed');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Migration process complete!\n');
    
    if (errors.length > 0 || skipCount > 0) {
      console.log('⚠️  Some statements could not be executed automatically.');
      console.log('   Please run the SQL manually in Supabase Dashboard if needed.\n');
    }
    
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();