"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Bagel, Tag } from "@/components/BagelCard";

type Props = {
  /** モーダルに表示したいベーグル */
  bagel: Bagel;
  /** 親で独自ハンドラを使いたい場合だけ渡す（省略可） */
  onClose?: () => void;
};

export default function BagelModal({ bagel, onClose }: Props) {
  const router = useRouter();

  // ――― ローカル state
  const [quantity, setQuantity] = useState(1);
  const [loaded, setLoaded]   = useState(false);

  const addToCart = useCartStore((s) => s.addToCart);

  // ――― 初期化（フェードイン & 背景スクロール禁止）
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  // ――― ハンドラ
  const close = () => (onClose ? onClose() : router.back());
  const inc   = () => setQuantity((q) => q + 1);
  const dec   = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const add   = () => {
    addToCart({ id: bagel.id, name: bagel.name, price: bagel.price, quantity });
    close();
  };

  // ――― JSX
  return (
<div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
  
  <div className="flex-1 relative w-full h-full bg-white overflow-y-auto ">
        {/* ✕ */}
        <button
          onClick={close}
          className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-black"
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
                loaded
                  ? "opacity-100 blur-0 scale-100"
                  : "opacity-70 blur-sm scale-105"
              }`}
            />
          </div>
        </div>

        {/* 情報 */}
        <div className="p-6 pt-8">
          <h2 className="text-3xl text-gray-400 mb-1 ">{bagel.name}</h2>

          <div className="flex space-x-1 py-5">
            {bagel.tags.includes("vegetarian") && (
              <Tag label="VG" color="lime-500" tooltip="ベジタリアン" />
            )}
            {bagel.tags.includes("vegan") && (
              <Tag label="V"  color="green-500" tooltip="ヴィーガン" />
            )}
          </div>

          <p className="text-xl text-gray-400 mb-6">{bagel.longDescription}</p>
          

          {/* 数量 */}
          <div className="my-8 ">
            <p className="mb-2 text-gray-400">数量</p>
            <div className="flex items-center border-2 border-gray-300 w-44 h-15">
              <button onClick={dec} className="flex-1 flex justify-center items-center">
                <Minus className="w-5 h-5" />
              </button>
              <span className="flex-1 text-center text-xl text-gray-400">{quantity}</span>
              <button onClick={inc} className="flex-1 flex justify-center items-center">
                <Plus className="w-5 h-5" />
                </button>
        </div>
      </div>
    </div>
  </div>

  {/* 固定フッター */}
  <div className="w-full max-w-md px-6 py-7 border-t border-gray-300 bg-white">
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
