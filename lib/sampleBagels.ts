import { Bagel } from "@/components/BagelCard";

export const sampleBagels: Bagel[] = [
  {
    id: 0,
    name: "PLAIN",
    description: "小麦粉 酵母 岩塩 麦芽水 で作られている。定番中の定番。",
    longDescription: `北海道の小麦粉 酵母 岩塩 麦芽水 で作られている。定番中の定番。
      シンプルな味わいながらも、北海道産の厳選された小麦粉を使用し、じっくりと発酵させることで
      深い風味を引き出しています。そのまま食べても、トーストしてバターを塗っても、
      サンドイッチにしても美味しくお召し上がりいただけます。`,
    price: 350,
    image: "/images/panpkin.jpg",        
    tags: ["vegan", "vegetarian"],
  },
  {
    id: 1,
    name: "SESAME",
    description: "原材料：北海道産小麦粉　種子島粗糖　シママース　天然酵母　国産かぼちゃ　カボチャの種",
    longDescription: `原材料：北海道産小麦粉　種子島粗糖　シママース　天然酵母　国産かぼちゃ　カボチャの種
      香ばしい胡麻の風味がベーグル本来の味わいを引き立てます。北海道産の厳選された小麦粉を使用し、
      じっくりと発酵させることで深い風味を引き出しています。朝食やランチに最適で、クリームチーズや
      アボカドとの相性が抜群です。`,
    price: 370,
    image: "/images/panpkin.jpg",
    tags: ["vegan", "vegetarian"],
  },
];
