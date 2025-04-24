"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Minus, Plus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

// 商品データ（実際の実装ではAPIから取得するなど）
const getBagelById = (id: string) => {
  const bagels = {
    plain: {
      id: "plain",
      name: "PLAIN",
      description: "北海道の小麦粉 酵母 岩塩 麦芽水 で作られている。マルイチベーグルの定番中の定番。",
      longDescription:
        "北海道の小麦粉 酵母 岩塩 麦芽水 で作られている。マルイチベーグルの定番中の定番。シンプルな味わいながらも、北海道産の厳選された小麦粉を使用し、じっくりと発酵させることで深い風味を引き出しています。そのまま食べても、トーストしてバターを塗っても、サンドイッチにしても美味しくお召し上がりいただけます。",
      price: 350,
      image: "/images/plain-bagel.jpg",
      tags: ["vegan", "vegetarian"],
    },
    sesame: {
      id: "sesame",
      name: "SESAME",
      description: "プレーンベーグルの表面に美味しい胡麻が付いている。Flour from Hokkaido, yeast, salt, malt water.",
      longDescription:
        "プレーンベーグルの表面に美味しい胡麻が付いている。香ばしい胡麻の風味がベーグル本来の味わいを引き立てます。北海道産の厳選された小麦粉を使用し、じっくりと発酵させることで深い風味を引き出しています。朝食やランチに最適で、クリームチーズやアボカドとの相性が抜群です。",
      price: 370,
      image: "/images/sesame-bagel.jpg",
      tags: ["vegan", "vegetarian"],
    },
  }

  // IDに基づいて商品を返す（存在しない場合はプレーンベーグルをデフォルトとする）
  return bagels[id as keyof typeof bagels] || bagels.plain
}

export default function BagelDetail({ params }: { params: { id: string } }) {
  const bagel = getBagelById(params.id)
  const [quantity, setQuantity] = useState(1)

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-white">
      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/bagel-background.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>

        {/* モバイル向けナビゲーション */}
        <nav className="relative z-10 flex items-center justify-between h-16 px-4 text-white">
          <Link href="/" className="flex items-center">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>戻る</span>
          </Link>
          <div className="flex items-center">
            <ShoppingBag className="h-5 w-5" />
            <span className="ml-1">0</span>
          </div>
        </nav>

        <div className="relative z-10 max-w-md mx-auto mt-4 bg-white text-black p-4 rounded-sm">
          <div className="bg-gray-100 p-3 mb-6 text-center">
            <p className="text-sm">お持ち帰り、できるだけ早く（明日） 変更</p>
          </div>

          {/* 商品画像 */}
          <div className="mb-6 flex justify-center">
            <div className="relative h-48 w-48 rounded-full overflow-hidden">
              <Image src={bagel.image || "/placeholder.svg"} alt={bagel.name} fill className="object-cover" />
            </div>
          </div>

          {/* 商品情報 */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium mb-2">{bagel.name}</h1>
            <div className="flex space-x-2 mb-3">
              {bagel.tags.includes("vegan") && (
                <div className="rounded-full border border-green-500 w-6 h-6 flex items-center justify-center">
                  <span className="text-xs text-green-500">Ve</span>
                </div>
              )}
              {bagel.tags.includes("vegetarian") && (
                <div className="rounded-full border border-green-500 w-6 h-6 flex items-center justify-center">
                  <span className="text-xs text-green-500">V</span>
                </div>
              )}
            </div>
            <p className="text-lg font-medium mb-4">¥ {bagel.price}</p>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{bagel.longDescription}</p>
          </div>

          {/* 数量選択 */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">数量</p>
            <div className="flex items-center border rounded-md w-32">
              <button onClick={decreaseQuantity} className="flex-1 h-10 flex items-center justify-center">
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 h-10 flex items-center justify-center border-l border-r">{quantity}</div>
              <button onClick={increaseQuantity} className="flex-1 h-10 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* カートに追加ボタン */}
          <Button className="w-full py-6 text-base bg-gray-900 hover:bg-gray-800">
            カートに追加 - ¥ {bagel.price * quantity}
          </Button>
        </div>
      </div>
    </main>
  )
}
