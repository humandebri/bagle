import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // カテゴリーの作成
  const regularMenu = await prisma.category.create({
    data: {
      name: '定番メニュー',
      description: 'いつでもご利用いただける定番のベーグルメニュー',
    },
  })

  const seasonalMenu = await prisma.category.create({
    data: {
      name: '季節限定メニュー',
      description: '季節ごとに登場する限定ベーグルメニュー',
    },
  })

  const sandwichMenu = await prisma.category.create({
    data: {
      name: 'サンドイッチ',
      description: 'ベーグルを使用したサンドイッチメニュー',
    },
  })

  const creamCheeseMenu = await prisma.category.create({
    data: {
      name: 'クリームチーズ',
      description: 'ベーグルと相性抜群のクリームチーズ',
    },
  })

  // タグの作成
  const vegetarianTag = await prisma.tag.create({
    data: {
      name: 'vegetarian',
      label: 'VG',
      color: 'lime-500',
      tooltip: 'ベジタリアン',
    },
  })

  const veganTag = await prisma.tag.create({
    data: {
      name: 'vegan',
      label: 'V',
      color: 'green-500',
      tooltip: 'ヴィーガン',
    },
  })

  // 商品の作成
  await prisma.product.create({
    data: {
      name: 'PLAIN',
      description: '小麦粉 酵母 岩塩 麦芽水 で作られている。定番中の定番。',
      longDescription: `北海道の小麦粉 酵母 岩塩 麦芽水 で作られている。定番中の定番。
        シンプルな味わいながらも、北海道産の厳選された小麦粉を使用し、じっくりと発酵させることで
        深い風味を引き出しています。そのまま食べても、トーストしてバターを塗っても、
        サンドイッチにしても美味しくお召し上がりいただけます。`,
      price: 350,
      image: '/images/panpkin.jpg',
      categoryId: regularMenu.id,
      tags: {
        connect: [
          { id: vegetarianTag.id },
          { id: veganTag.id },
        ],
      },
    },
  })

  // 他の商品も同様に追加...
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 