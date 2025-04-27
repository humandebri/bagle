"use client";

import { useRouter } from "next/navigation";
import { sampleBagels } from "@/lib/sampleBagels";
import Image from "next/image";
import { use, useEffect, useState } from "react";
import { Bagel } from "@/components/BagelCard";
import { Minus, Plus } from "lucide-react";


export default function BagelModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const resolvedParams = use(params);

  const bagel: Bagel = sampleBagels.find(
    (b) => b.id.toString() === resolvedParams.id
  ) || sampleBagels[0];

  const [quantity, setQuantity] = useState(1);
  const increaseQuantity = () => setQuantity((prev) => prev + 1);
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // ページ読み込み後にフェードイン処理
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100); // すぐに切り替える場合は0、ゆっくりならもっと遅らせる
    // PCだけスクロールを止める
    if (window.innerWidth >= 768) {
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
  }, []);

  return (
    <div
  className={`
    md:fixed md:inset-0 md:z-50 md:bg-black/50 md:flex md:items-center md:justify-center
    min-h-screen bg-white text-black
  `}
>
  <div className="relative bg-white pt-6 px-6 pb-6 w-full max-w-md mx-auto shadow-lg md:rounded-lg md:my-auto flex flex-col  max-h-[90vh]  overflow-hidden">
    
    {/* 上部：スクロール可能 */}
    <div className="flex-1 ">
      {/* overflow-y-auto */}
      {/* ✕ 閉じるボタン */}
      <div className="absolute top-2 right-3 bg-white rounded-full w-9 h-9 flex items-center justify-center cursor-pointer">
        <button
          className="text-2xl text-gray-500 hover:text-black"
          onClick={() => router.back()}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      {/* 画像 */}
      <div className="flex justify-center mb-4 mt-10 md:mt-0">
        <div className="relative h-50 w-80 rounded-full overflow-hidden">
          <Image
            src={bagel.image ?? "/placeholder.svg"}
            alt={bagel.name}
            fill
            className={`
              object-cover
              transform transition-all duration-800
              ${loaded ? "blur-0 opacity-100 scale-100" : "blur-sm opacity-70 scale-105"}
            `}
          />
        </div>
      </div>

      {/* 情報 */}
      <h2 className="text-3xl mb-2 pt-5 text-gray-400">{bagel.name}</h2>
      <h3 className="text-xl text-gray-400 mb-4">{bagel.longDescription}</h3>

      <div className="mb-6 flex flex-col">
        <p className="text-gray-400 mb-2 py-4">数量</p>

        <div className="flex items-center border w-45 h-15 border-gray-400">
          <button onClick={decreaseQuantity} className="flex-1 h-10 flex items-center justify-center">
            <Minus className="h-6 w-6" />
          </button>
          <div className="flex-1 h-10 flex items-center justify-center text-gray-600 text-xl">
            {quantity}
          </div>
          <button onClick={increaseQuantity} className="flex-1 h-10 flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

    </div>

    

    {/* 下部：固定フッター */}
  
    <div className="fixed bottom-10 w-full  border-t border-gray-300 bg-white">
      {/* ボタン */}
      <button className="w-full py-3 bg-[#887c5d] text-white hover:bg-gray-500">
        注文に追加する ¥{quantity * bagel.price}
      </button>
    </div>

  </div>
</div>
  );
}
