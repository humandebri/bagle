import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createFunctions() {
  console.log('🚀 Creating database functions...\n');
  
  const functions = [
    {
      name: 'cleanup_expired_time_slot_reservations',
      sql: `
CREATE OR REPLACE FUNCTION cleanup_expired_time_slot_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE time_slots
  SET 
    current_bookings = 0,
    reservation_session_id = NULL,
    reservation_expires_at = NULL
  WHERE 
    reservation_expires_at IS NOT NULL 
    AND reservation_expires_at < NOW();
END;
$$`
    },
    {
      name: 'reserve_time_slot',
      sql: `
CREATE OR REPLACE FUNCTION reserve_time_slot(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_time_value TIME;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_confirmed_orders INTEGER;
BEGIN
  PERFORM cleanup_expired_time_slot_reservations();
  
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  v_expires_at := NOW() + INTERVAL '15 minutes';
  
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', '時間枠が見つかりません'
    );
  END IF;
  
  SELECT COUNT(*) INTO v_confirmed_orders
  FROM orders
  WHERE dispatch_date = p_date::TEXT
    AND dispatch_time = p_time::TEXT
    AND payment_status != 'cancelled';
  
  IF v_confirmed_orders >= v_slot.max_capacity THEN
    RETURN json_build_object(
      'success', false,
      'message', 'この時間枠は満員です'
    );
  END IF;
  
  IF v_slot.reservation_session_id IS NOT NULL 
     AND v_slot.reservation_session_id != p_session_id
     AND v_slot.reservation_expires_at > NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', '他のユーザーが予約中です'
    );
  END IF;
  
  UPDATE time_slots
  SET 
    current_bookings = 1,
    reservation_session_id = p_session_id,
    reservation_expires_at = v_expires_at
  WHERE date = p_date AND time = v_time_value;
  
  RETURN json_build_object(
    'success', true,
    'expires_at', v_expires_at::TEXT,
    'message', '15分間仮予約しました'
  );
END;
$$`
    },
    {
      name: 'release_time_slot_reservation',
      sql: `
CREATE OR REPLACE FUNCTION release_time_slot_reservation(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time_value TIME;
BEGIN
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  UPDATE time_slots
  SET 
    current_bookings = 0,
    reservation_session_id = NULL,
    reservation_expires_at = NULL
  WHERE 
    date = p_date 
    AND time = v_time_value
    AND reservation_session_id = p_session_id;
END;
$$`
    },
    {
      name: 'check_slot_availability',
      sql: `
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_time_value TIME;
  v_confirmed_orders INTEGER;
  v_is_reserved BOOLEAN;
  v_available_capacity INTEGER;
BEGIN
  PERFORM cleanup_expired_time_slot_reservations();
  
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value;
  
  IF NOT FOUND OR NOT v_slot.is_available THEN
    RETURN json_build_object(
      'available', false,
      'capacity', 0,
      'message', '利用できません'
    );
  END IF;
  
  SELECT COUNT(*) INTO v_confirmed_orders
  FROM orders
  WHERE dispatch_date = p_date::TEXT
    AND dispatch_time = p_time::TEXT
    AND payment_status != 'cancelled';
  
  v_is_reserved := v_slot.reservation_session_id IS NOT NULL 
                   AND v_slot.reservation_expires_at > NOW()
                   AND (p_session_id IS NULL OR v_slot.reservation_session_id != p_session_id);
  
  v_available_capacity := v_slot.max_capacity - v_confirmed_orders;
  IF v_is_reserved THEN
    v_available_capacity := v_available_capacity - 1;
  END IF;
  
  RETURN json_build_object(
    'available', v_available_capacity > 0,
    'capacity', GREATEST(0, v_available_capacity),
    'is_reserved_by_me', v_slot.reservation_session_id = p_session_id,
    'message', CASE 
      WHEN v_available_capacity > 0 THEN '利用可能'
      WHEN v_is_reserved THEN '他のユーザーが予約中'
      ELSE '満員'
    END
  );
END;
$$`
    }
  ];
  
  try {
    for (const func of functions) {
      console.log(`📝 Creating function: ${func.name}`);
      try {
        await prisma.$executeRawUnsafe(func.sql);
        console.log(`   ✅ Created successfully`);
      } catch (error: any) {
        console.log(`   ❌ Error:`, error.message?.substring(0, 200));
      }
    }
    
    // Verify
    console.log('\n🧪 Verifying functions...\n');
    
    const createdFunctions = await prisma.$queryRaw`
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
    
    console.log(`✅ Successfully created ${createdFunctions.length}/4 functions:`);
    createdFunctions.forEach((f: any) => console.log(`   - ${f.routine_name}`));
    
    if (createdFunctions.length === 4) {
      console.log('\n🎉 All functions created successfully!');
    } else {
      console.log('\n⚠️  Some functions could not be created. Please check the errors above.');
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFunctions();