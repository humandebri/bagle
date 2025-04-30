'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { sampleBagels } from "@/lib/sampleBagels"; // Bagelデータを探す用
import { Tag } from "@/components/BagelCard";

export default function BagelModalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // すでに string 型のはず
  const bagel = sampleBagels.find(b => b.id === id);

  const cartItems = useCartStore((s) => s.items); // カート中身を取得
  const addToCart = useCartStore((s) => s.addToCart);

  // すでにカートにある場合、その個数を初期値に
  const existingItem = cartItems.find((item) => item.id.toString() === id);
  const [quantity, setQuantity] = useState(existingItem ? existingItem.quantity : 1);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  const close = () => router.back();
  const inc = () => setQuantity((q) => (q < 8 ? q + 1 : q));
  const dec = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const add = () => {
    if (!bagel) return;
    addToCart({ id: bagel.id, name: bagel.name, price: bagel.price, quantity });
    close();
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  if (!bagel) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        商品が見つかりませんでした
      </div>
    );
  }

  return (
    <div
    className="fixed inset-0 z-50  bg-white md:bg-black/50 flex flex-col overflow-y-scroll  overscroll-contain touch-auto"
    onClick={handleBackgroundClick}
  >
    <div
      className="relative pb-28 mx-auto w-full max-w-md md:max-w-[500px] bg-white shadow-lg md:mt-20 md:mb-10 rounded-lg overflow-hidden min-h-full "
      onClick={(e) => e.stopPropagation()}
    >
        {/* ✕ボタン（スマホのみ表示） */}
        <button
          onClick={close}
          className="absolute top-2 right-4 text-3xl text-gray-400 hover:text-black md:hidden"
          aria-label="閉じる"
        >
          ✕
        </button>

        {/* 画像 */}
        <div className="mt-12 flex justify-center">
          <div className="relative w-80 h-50 rounded-full overflow-hidden">
            <Image
              src={bagel.image ?? "/placeholder.svg"}
              alt={bagel.name}
              fill
              className={`object-cover transition-all duration-700 ${
                loaded ? "opacity-100 blur-0 scale-100" : "opacity-70 blur-sm scale-105"
              }`}
            />
          </div>
        </div>

        {/* 情報 */}
        <div className="p-6 pt-8">
          <h2 className="text-3xl text-gray-400 mb-1">{bagel.name}</h2>

          <div className="flex space-x-1 py-5">
            {bagel.tags.includes("vegetarian") && (
              <Tag label="VG" color="lime-500" tooltip="ベジタリアン" />
            )}
            {bagel.tags.includes("vegan") && (
              <Tag label="V" color="green-500" tooltip="ヴィーガン" />
            )}
          </div>

          <p className="text-xl text-gray-400 mb-6">{bagel.longDescription}</p>

          {/* 数量 & 注文ボタン */}
          <div className="my-8">
            <p className="mb-2 text-gray-400">数量</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border-2 border-gray-300 w-44 h-15">
                <button onClick={dec} className="flex-1 flex justify-center items-center">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="flex-1 text-center text-xl text-gray-400">{quantity}</span>
                <button onClick={inc} className="flex-1 flex justify-center items-center">
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* PCだけ 注文ボタン横並び */}
              <button
                onClick={add}
                className="hidden md:inline-block flex-shrink-0 w-64 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
              >
                注文 ¥{quantity * bagel.price}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* スマホだけ 固定フッター */}
      <div className="md:hidden sticky bottom-0  w-full max-w-md px-6 py-7 border-t border-gray-300 bg-white">
        <button
          onClick={add}
          className="w-full py-5 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          注文に追加する ¥{quantity * bagel.price}
        </button>
      </div>
    </div>
  );
}
