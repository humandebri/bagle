import { prisma } from '../lib/prisma';

async function addMoreNews() {
  try {
    const newsData = [
      {
        date: '2025.01.08',
        title: '1月の営業日について',
        content: '1月は通常通り木・金・土曜日の営業となります。第4日曜日（1月26日）も営業いたします。',
        is_published: true
      },
      {
        date: '2025.01.05',
        title: 'Instagram始めました',
        content: '日々のベーグル情報や新商品のお知らせをInstagramでも発信していきます。ぜひフォローしてください。',
        is_published: true
      },
      {
        date: '2024.12.28',
        title: '年末年始の営業について',
        content: '年末は12月28日（土）まで、年始は1月9日（木）から営業いたします。新年もよろしくお願いいたします。',
        is_published: true
      },
      {
        date: '2024.12.20',
        title: 'クリスマス限定ベーグル販売',
        content: 'クリスマス限定のシナモンレーズンベーグルを販売中です。数量限定となりますので、お早めにご来店ください。',
        is_published: true
      }
    ];

    for (const news of newsData) {
      await prisma.news.create({
        data: news
      });
    }

    console.log('追加のニュースデータを作成しました');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreNews();