'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Tag } from "@/components/BagelCard";
import { MAX_BAGEL_PER_ORDER, MAX_BAGEL_PER_ITEM, MAX_BAGEL_PER_ITEM_FILLING } from "@/lib/constants";
import { toast } from "sonner";
import { RemoveScroll } from "react-remove-scroll";

type Product = {
  id: string;
  name: string;
  description: string;
  long_description: string;
  price: number;
  image: string;
  image_webp: string | null;
  is_available: boolean;
  is_limited: boolean;
  start_date: string | null;
  end_date: string | null;
  category: {
    name: string;
  };
};

export default function BagelModalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addItem);

  // すでにカートにある場合、その個数を初期値に
  const existingItem = cartItems.find((item) => item.id.toString() === id);
  const [quantity, setQuantity] = useState(existingItem ? existingItem.quantity : 1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
        }
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('商品データの取得に失敗しました:', error);
        }
        setError('商品データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // 背景スクロールのロックはライブラリで実施（react-remove-scroll）
  // かつ、モーダルクローズ時にスクロール位置を復元
  const restoreYRef = useRef(0);
  useEffect(() => {
    try {
      restoreYRef.current = window.scrollY || 0;
    } catch {}
    return () => {
      const y = restoreYRef.current || 0;
      // レイアウト適用後に復元（2段階で安全側）
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        setTimeout(() => window.scrollTo(0, y), 0);
      });
    };
  }, []);

  const close = () => router.back();
  const inc = () => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity >= MAX_BAGEL_PER_ORDER) {
      toast.error(`予約できる個数は最大${MAX_BAGEL_PER_ORDER}個までです！`, {
        description: `お一人様${MAX_BAGEL_PER_ORDER}個までご予約いただけます。`,
      });
      return;
    }
    
    // カテゴリーに応じた制限値を設定
    const maxPerItem = product?.category?.name === 'フィリングベーグル' 
      ? MAX_BAGEL_PER_ITEM_FILLING 
      : MAX_BAGEL_PER_ITEM;
    
    if (quantity >= maxPerItem) {
      toast.error(`1つの商品は最大${maxPerItem}個までです！`, {
        description: `${product?.category?.name === 'フィリングベーグル' ? 'フィリングベーグルは' : 'お一人様1つの商品につき'}${maxPerItem}個までご予約いただけます。`,
      });
      return;
    }
    setQuantity((q) => q + 1);
  };
  const dec = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const add = () => {
    if (!product) return;
    
    const totalQuantity = cartItems.reduce((sum, item) => {
      // 現在の商品以外の合計を計算
      if (item.id === product.id) return sum;
      return sum + item.quantity;
    }, 0);

    if (totalQuantity + quantity > MAX_BAGEL_PER_ORDER) {
      toast.error(`予約できる個数は最大${MAX_BAGEL_PER_ORDER}個までです！`, {
        description: `お一人様${MAX_BAGEL_PER_ORDER}個までご予約いただけます。`,
      });
      return;
    }

    addToCart(
      { id: product.id, name: product.name, price: product.price, quantity, category: product.category }
    );
    close();
  };
  
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        {error || '商品が見つかりませんでした'}
      </div>
    );
  }

  return (
    <RemoveScroll>
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex flex-col overflow-y-auto md:items-center md:justify-center transition-opacity duration-150"
      onClick={handleBackgroundClick}
    >
    <div
      className="relative mx-auto w-full max-w-md md:max-w-[500px] bg-white md:rounded-lg md:shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
        {/* ✕ボタン（スマホのみ表示） */}
        <button
          onClick={close}
          className="absolute top-2 right-4 z-10 text-3xl text-gray-400 hover:text-black md:hidden"
          aria-label="閉じる"
        >
          ✕
        </button>

        {/* 画像 */}
        <div className="relative w-full aspect-square overflow-hidden">
          <SafeImage
            product={product}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* 情報 */}
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

          <p className="text-xl text-gray-400 mb-3">{product.description}</p>

          {/* 数量 & 注文ボタン */}
          <div className="my-8 pb-25 sm:pb-5 bg-white">
            <p className="mb-2 text-gray-400 ">数量</p>
            <div className="flex items-center space-x-4 ">
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
                注文 ¥{quantity * product.price}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* スマホだけ 固定フッター */}
    </div>
  <div className="md:hidden z-[70] fixed bottom-0  w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white">
    <button
      onClick={add}
      className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
    >
      注文に追加する ¥{quantity * product.price}
    </button>
  </div>
  </RemoveScroll>
  );
}
