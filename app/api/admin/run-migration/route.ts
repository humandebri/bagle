import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Check admin auth
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sqlPath = path.join(process.cwd(), 'supabase', 'simplify-to-time-slots-only.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL as a single transaction
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: fullSql
    });

    if (error) {
      // If exec_sql doesn't exist, let's try running individual statements
      console.log('exec_sql not available, running statements manually...');
      
      const results = [];
      
      // Step 1: Drop temporary_slot_reservations table
      try {
        await supabaseAdmin.from('temporary_slot_reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('Cleared temporary_slot_reservations table');
      } catch {
        console.log('Table might not exist or be empty');
      }
      
      // Step 2: Check if columns exist already
      const { data: sampleSlot } = await supabaseAdmin
        .from('time_slots')
        .select('*')
        .limit(1);
      
      const hasReservationFields = sampleSlot && sampleSlot[0] && 
        'reservation_session_id' in sampleSlot[0] && 
        'reservation_expires_at' in sampleSlot[0];
      
      if (hasReservationFields) {
        results.push('Reservation fields already exist in time_slots table');
      } else {
        return NextResponse.json({ 
          error: 'Cannot add columns via API. Please run the migration SQL directly in Supabase Dashboard SQL Editor.',
          sql: fullSql
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true,
        results,
        message: 'Migration check complete. To apply full migration, please run the SQL in Supabase Dashboard.'
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration applied successfully',
      data 
    });
  } catch (err) {
    console.error('Migration error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Migration failed',
      details: message 
    }, { status: 500 });
  }
}