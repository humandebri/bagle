async function testBulkCreate() {
  console.log('🧪 Testing bulk create functionality...\n');
  
  const baseUrl = 'http://localhost:3006';
  
  // テスト用のスロットデータ
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 14); // 2週間後
  const dateStr = testDate.toISOString().split('T')[0];
  
  const testSlots = [
    { date: dateStr, time: '11:00', max_capacity: 2, is_available: true },
    { date: dateStr, time: '11:15', max_capacity: 2, is_available: true },
    { date: dateStr, time: '11:30', max_capacity: 2, is_available: true },
    { date: dateStr, time: '11:45', max_capacity: 2, is_available: true },
    { date: dateStr, time: '12:00', max_capacity: 8, is_available: true },
  ];
  
  console.log(`Creating ${testSlots.length} time slots for ${dateStr}...`);
  
  for (const slot of testSlots) {
    try {
      const response = await fetch(`${baseUrl}/api/time_slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Created: ${slot.time} - Capacity: ${slot.max_capacity}`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed: ${slot.time} - ${error.error}`);
      }
    } catch (err: any) {
      console.log(`❌ Error: ${slot.time} - ${err.message}`);
    }
  }
  
  // 結果を確認
  console.log('\nFetching all time slots...');
  
  try {
    const response = await fetch(`${baseUrl}/api/time_slots`);
    const data = await response.json();
    
    console.log(`\nTotal slots in database: ${data.timeSlots?.length || 0}`);
    
    const todaySlots = data.timeSlots?.filter((s: any) => s.date === dateStr);
    console.log(`Slots for ${dateStr}: ${todaySlots?.length || 0}`);
    
    if (todaySlots && todaySlots.length > 0) {
      console.log('\nCreated slots:');
      todaySlots.forEach((slot: any) => {
        console.log(`  ${slot.time.slice(0, 5)} - Capacity: ${slot.max_capacity}, Bookings: ${slot.current_bookings}, Available: ${slot.is_available}`);
      });
    }
  } catch (err: any) {
    console.error('Failed to fetch slots:', err.message);
  }
  
  console.log('\n✨ Test complete!');
}

testBulkCreate();