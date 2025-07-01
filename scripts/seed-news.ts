import { prisma } from '../lib/prisma';

async function seedNews() {
  try {
    // Delete existing news first (optional)
    await prisma.news.deleteMany();

    // Create test news items
    const newsItems = [
      {
        date: '2025.01.14',
        title: '新商品「抹茶ベーグル」販売開始',
        content: '京都宇治産の抹茶を使用した、香り高い和風ベーグルが新登場です。',
        is_published: true
      },
      {
        date: '2025.01.10',
        title: 'オンライン予約システム開始',
        content: 'お待たせしました！オンラインでの事前予約が可能になりました。',
        is_published: true
      },
      {
        date: '2025.01.05',
        title: '年始の営業について',
        content: '新年は1月7日より通常営業を開始いたします。本年もよろしくお願いいたします。',
        is_published: true
      }
    ];

    for (const item of newsItems) {
      await prisma.news.create({
        data: item
      });
    }

    console.log('✅ News seeded successfully');
  } catch (error) {
    console.error('Error seeding news:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNews();