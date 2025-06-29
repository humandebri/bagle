import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding business calendar data...');

  // 営業時間の初期データ
  const businessHours = [
    { day_of_week: 0, open_time: new Date('1970-01-01T11:00:00'), close_time: new Date('1970-01-01T13:00:00'), is_closed: false }, // 日曜
    { day_of_week: 1, open_time: new Date('1970-01-01T11:00:00'), close_time: new Date('1970-01-01T13:00:00'), is_closed: false }, // 月曜
    { day_of_week: 2, open_time: new Date('1970-01-01T11:00:00'), close_time: new Date('1970-01-01T13:00:00'), is_closed: false }, // 火曜
    { day_of_week: 3, open_time: new Date('1970-01-01T11:00:00'), close_time: new Date('1970-01-01T13:00:00'), is_closed: false }, // 水曜
    { day_of_week: 4, open_time: null, close_time: null, is_closed: true }, // 木曜（定休日）
    { day_of_week: 5, open_time: null, close_time: null, is_closed: true }, // 金曜（定休日）
    { day_of_week: 6, open_time: null, close_time: null, is_closed: true }, // 土曜（定休日）
  ];

  for (const hours of businessHours) {
    await prisma.business_hours.upsert({
      where: { day_of_week: hours.day_of_week },
      update: hours,
      create: hours,
    });
  }

  // 定期休業日の初期データ
  await prisma.recurring_holidays.create({
    data: {
      name: '第4日曜日',
      type: 'monthly',
      pattern: { week: 4, dayOfWeek: 0 },
      is_active: true,
    },
  });

  // サンプル営業日データ（今月分）
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const sampleDays = [
    { date: new Date(year, month, 14), is_open: true, is_special: false, notes: null },
    { date: new Date(year, month, 15), is_open: true, is_special: false, notes: null },
    { date: new Date(year, month, 16), is_open: false, is_special: false, notes: '設備メンテナンス' },
    { date: new Date(year, month, 17), is_open: true, is_special: false, notes: null },
    { date: new Date(year, month, 18), is_open: true, is_special: false, notes: null },
    { date: new Date(year, month, 19), is_open: true, is_special: false, notes: null },
    { date: new Date(year, month, 20), is_open: true, is_special: true, notes: '特別営業日' },
  ];

  for (const day of sampleDays) {
    await prisma.business_days.upsert({
      where: { date: day.date },
      update: day,
      create: day,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });