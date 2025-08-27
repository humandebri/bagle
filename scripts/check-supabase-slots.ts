import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseSlots() {
  console.log('🔍 Checking time_slots via Supabase...\n');
  
  try {
    // Get all time slots
    const { data: slots, error } = await supabase
      .from('time_slots')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: true });
    
    if (error) {
      console.error('Error fetching slots:', error);
      return;
    }
    
    console.log(`Total slots: ${slots?.length || 0}`);
    
    if (slots && slots.length > 0) {
      console.log('\nAll time slots:');
      slots.forEach(slot => {
        console.log(`  ${slot.date} ${slot.time} - Capacity: ${slot.max_capacity}, Available: ${slot.is_available}, Bookings: ${slot.current_bookings}`);
      });
      
      // Fix is_available = false
      const unavailable = slots.filter(s => !s.is_available);
      if (unavailable.length > 0) {
        console.log(`\nFound ${unavailable.length} unavailable slots. Fixing...`);
        
        for (const slot of unavailable) {
          const { error: updateError } = await supabase
            .from('time_slots')
            .update({ is_available: true })
            .eq('id', slot.id);
          
          if (!updateError) {
            console.log(`  ✅ Fixed: ${slot.date} ${slot.time}`);
          }
        }
      }
    }
    
    // Test API
    console.log('\nTesting API endpoint...');
    const response = await fetch('http://localhost:3006/api/time_slots');
    const apiData = await response.json();
    
    console.log(`API returned ${apiData.timeSlots?.length || 0} slots`);
    
    if (apiData.timeSlots && apiData.timeSlots.length > 0) {
      console.log('\nAPI response sample:');
      apiData.timeSlots.slice(0, 5).forEach((slot: any) => {
        console.log(`  ${slot.date} ${slot.time} - Capacity: ${slot.max_capacity}, Bookings: ${slot.current_bookings}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSupabaseSlots();