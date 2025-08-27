import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Testing database functions for simplified reservation system...');
  
  try {
    // Test cleanup_expired_time_slot_reservations
    console.log('1. Testing cleanup_expired_time_slot_reservations...');
    const { error: cleanupError } = await supabaseAdmin
      .rpc('cleanup_expired_time_slot_reservations');
    
    if (cleanupError) {
      console.error('Function not found - need to create it:', cleanupError);
    } else {
      console.log('✓ cleanup_expired_time_slot_reservations exists');
    }
    
    // Test reserve_time_slot 
    console.log('2. Testing reserve_time_slot...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7); // 7 days from now
    
    const { data: reserveData, error: reserveError } = await supabaseAdmin
      .rpc('reserve_time_slot', {
        p_date: testDate.toISOString().split('T')[0],
        p_time: '11:00',
        p_session_id: 'test_migration_' + Date.now()
      });
    
    if (reserveError) {
      console.error('Function not found - need to create it:', reserveError);
    } else {
      console.log('✓ reserve_time_slot exists');
      console.log('  Result:', reserveData);
    }
    
    // Test check_slot_availability
    console.log('3. Testing check_slot_availability...');
    const { data: checkData, error: checkError } = await supabaseAdmin
      .rpc('check_slot_availability', {
        p_date: testDate.toISOString().split('T')[0],
        p_time: '11:00',
        p_session_id: 'test_migration_' + Date.now()
      });
    
    if (checkError) {
      console.error('Function not found - need to create it:', checkError);
    } else {
      console.log('✓ check_slot_availability exists');
      console.log('  Result:', checkData);
    }
    
    // Check if time_slots table has the new columns
    console.log('4. Checking time_slots table schema...');
    const { data: columns, error: schemaError } = await supabaseAdmin
      .from('time_slots')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('Error checking schema:', schemaError);
    } else if (columns && columns.length > 0) {
      const hasReservationFields = 
        'reservation_session_id' in columns[0] && 
        'reservation_expires_at' in columns[0];
      
      if (hasReservationFields) {
        console.log('✓ time_slots table has new reservation fields');
      } else {
        console.log('✗ time_slots table missing reservation fields - migration needed');
      }
    }
    
    console.log('\nMigration check complete!');
    
  } catch (err) {
    console.error('Migration check failed:', err);
    process.exit(1);
  }
}

runMigration();