'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Tag } from "@/components/BagelCard";
import { MAX_BAGEL_PER_ORDER, MAX_BAGEL_PER_ITEM } from "@/lib/constants";
import { toast } from "sonner";

// このページのProduct型定義はstoreからimportするため不要
// type Product = { ... };

export default function BagelModalPage() {
  const router = useRouter();
  const product = useCartStore((s) => s.selectedProduct);
  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addItem);

  // 既にカートにある商品の個数を初期値とする
  const existingItem = product ? cartItems.find((item) => item.id === product.id) : undefined;
  const [quantity, setQuantity] = useState(existingItem ? existingItem.quantity : 1);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // URL直打ちなどでproductがない場合は、モーダルを閉じる
    if (!product) {
      router.back();
      return;
    }

    const t = setTimeout(() => setLoaded(true), 100);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [product, router]);

  const close = () => router.back();

  const inc = () => {
    const totalQuantityInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantityInCart >= MAX_BAGEL_PER_ORDER) {
      toast.error(`注文できる合計は${MAX_BAGEL_PER_ORDER}個までです。`);
      return;
    }
    if (quantity >= MAX_BAGEL_PER_ITEM) {
      toast.error(`同じ商品は${MAX_BAGEL_PER_ITEM}個までです。`);
      return;
    }
    setQuantity((q) => q + 1);
  };

  const dec = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const add = () => {
    if (!product) return;

    const totalOtherItems = cartItems.reduce((sum, item) => {
      return item.id === product.id ? sum : sum + item.quantity;
    }, 0);

    if (totalOtherItems + quantity > MAX_BAGEL_PER_ORDER) {
      toast.error(`注文できる合計は${MAX_BAGEL_PER_ORDER}個までです。`);
      return;
    }

    addToCart({ id: product.id, name: product.name, price: product.price, quantity });
    close();
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  // productが存在しない場合（URL直打ちなど）、何も表示しない（useEffectでリダイレクトされる）
  if (!product) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-10 md:bg-black/50 flex flex-col overflow-y-auto md:items-center md:justify-center"
        onClick={handleBackgroundClick}
      >
        <div
          className="relative mx-auto w-full max-w-md md:max-w-[500px] bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            className="absolute top-2 right-4 text-3xl text-gray-400 hover:text-black md:hidden"
            aria-label="閉じる"
          >
            ✕
          </button>

          <div className="flex justify-center">
            <div className="relative w-80 h-70 overflow-hidden">
              {product.image && product.image !== '' && product.image !== null ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className={`object-cover transition-all duration-700 ${
                    loaded ? "opacity-100 blur-0 scale-100" : "opacity-70 blur-sm scale-105"
                  }`}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 pt-8">
            <h2 className="text-3xl text-gray-400 mb-1">{product.name}</h2>

            <div className="flex space-x-1 py-5">
              {product.category.name === "vegetarian" && (
                <Tag label="VG" color="lime-500" tooltip="ベジタリアン" />
              )}
              {product.category.name === "vegan" && (
                <Tag label="V" color="green-500" tooltip="ヴィーガン" />
              )}
            </div>

            <p className="text-xl text-gray-400 mb-3">{product.long_description}</p>

            <div className="my-8 pb-25 sm:pb-5 bg-white">
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

                <button
                  onClick={add}
                  className="hidden md:inline-block flex-shrink-0 w-64 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
                >
                  注文 ¥{quantity * product.price}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden z-20 fixed bottom-0 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white">
        <button
          onClick={add}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          注文に追加する ¥{quantity * product.price}
        </button>
      </div>
    </>
  );
}