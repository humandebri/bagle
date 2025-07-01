import { prisma } from '../lib/prisma';

async function seedNews() {
  try {
    const newsData = [
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
      }
    ];

    for (const news of newsData) {
      await prisma.news.create({
        data: news
      });
    }

    console.log('ニュースのシードデータを作成しました');
  } catch (error) {
    console.error('シードデータの作成に失敗しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNews();