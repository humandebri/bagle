'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { ShoppingBag } from 'lucide-react';
import BagelMenu from '@/components/BagelMenu';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { Bagel } from '@/components/BagelCard';

type Product = {
  id: string;
  name: string;
  description: string;
  long_description: string;
  price: number;
  image: string;
  is_available: boolean;
  is_limited: boolean;
  start_date: string | null;
  end_date: string | null;
  category: {
    name: string;
  };
};

export default function OnlineShopPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cartItems = useCartStore((s) => s.items);
  const totalQuantity = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('商品データの取得に失敗しました');
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('商品データの取得に失敗しました:', error);
      setError('商品データの取得に失敗しました');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const convertToBagels = (products: Product[]): Bagel[] => {
    return products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      longDescription: product.long_description,
      price: product.price,
      image: product.image,
      tags: [],
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)]">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)] text-red-500">{error}</div>;
  }

  return (
    <>
      <main className="min-h-[calc(100vh-7rem)] pb-15">
        <div className="relative z-10 mx-auto mt-5 bg-white text-gray-400 p-6 rounded-sm">
          <div className="border-2 p-3 mb-6 text-center max-w-4xl mx-auto">
            {mounted && (
              <button onClick={() => router.push(`/online-shop/dispatch`)}>
                {dispatchDate && dispatchTime ? (
                  <DateTimeDisplay date={dispatchDate} time={dispatchTime} />
                ) : (
                  "日時を選択してください"
                )}
              </button>
            )}
          </div>

          <div className="flex border-b sm:border-b-0  max-w-4xl mx-auto ">
            <div className=" border-b-2 pl-4">
              <button className="font-medium text-2xl text-gray-400">BAGEL</button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <BagelMenu bagels={convertToBagels(products)} />
          </div>
        </div>
      </main>

      {mounted && totalQuantity > 0 && (
        <CartFooter
          totalQuantity={totalQuantity}
          onClick={() => router.push('/online-shop/cart')}
        />
      )}
    </>
  );
}

function CartFooter({
  totalQuantity,
  onClick,
}: {
  totalQuantity: number;
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-0 w-full bg-white flex justify-center z-20 border-t border-gray-300">
      <div className="w-full max-w-md px-6 py-3">
        <button
          onClick={onClick}
          className="w-full relative py-3 bg-[#887c5d] text-gray-200 hover:bg-gray-600 text-xl flex items-center justify-center"
          aria-label="カートを見る"
        >
          カートを見る
          <div className="flex absolute right-6">
            <ShoppingBag className="h-5 w-5" />
            {totalQuantity > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
