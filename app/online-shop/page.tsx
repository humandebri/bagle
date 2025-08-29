'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { ShoppingBag, AlertCircle } from 'lucide-react';
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
  image_webp: string | null;
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
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number | null>(null);
  const [availableCapacityTotal, setAvailableCapacityTotal] = useState<number | null>(null);
  const [checkingSlots, setCheckingSlots] = useState(true);
  
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
      if (process.env.NODE_ENV === 'development') {
        console.error('商品データの取得に失敗しました:', error);
      }
      setError('商品データの取得に失敗しました');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableSlots = useCallback(async () => {
    try {
      const response = await fetch('/api/get-available-slots');
      if (!response.ok) {
        throw new Error('時間枠データの取得に失敗しました');
      }
      const data = await response.json();
      
      // ユーザーが既に選択している時間枠を取得
      const userDispatchDate = dispatchDate;
      const userDispatchTime = dispatchTime;
      
      // 利用可能な時間枠をカウント（ユーザーが選択済みの枠も利用可能とみなす）
      const availableSlots = data.timeSlots?.filter((slot: { is_available: boolean; date: string; time: string; max_capacity: number; current_bookings: number; temp_bookings?: number }) => {
        // ユーザーが選択している時間枠の場合は常に利用可能とみなす
        if (userDispatchDate && userDispatchTime && 
            slot.date === userDispatchDate && 
            slot.time.slice(0, 5) === userDispatchTime) {
          return true;
        }
        // それ以外は通常の利用可能性チェック
        return slot.is_available;
      }) || [];
      
      // 時間枠の数をカウント
      setAvailableSlotsCount(availableSlots.length);
      
      // 実際の予約可能数（各スロットの残り容量の合計）を計算（仮予約分も考慮）
      const totalCapacity = availableSlots.reduce((sum: number, slot: { max_capacity: number; current_bookings: number; temp_bookings?: number }) => {
        const remainingCapacity = Math.max(0, slot.max_capacity - slot.current_bookings - (slot.temp_bookings ?? 0));
        return sum + remainingCapacity;
      }, 0);
      
      setAvailableCapacityTotal(totalCapacity);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('時間枠データの取得に失敗しました:', error);
      }
      setAvailableSlotsCount(0);
      setAvailableCapacityTotal(0);
    } finally {
      setCheckingSlots(false);
    }
  }, [dispatchDate, dispatchTime]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    checkAvailableSlots();
    
    // 30秒ごとに利用可能な時間枠をチェック
    const interval = setInterval(() => {
      checkAvailableSlots();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatchDate, dispatchTime, checkAvailableSlots]);

  const convertToBagels = (products: Product[]): Bagel[] => {
    return products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      longDescription: product.long_description,
      price: product.price,
      image: product.image && product.image !== '' ? product.image : undefined,
      image_webp: product.image_webp || undefined,
      tags: product.is_available ? [] : ['販売停止中'],
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
      <main className="min-h-[calc(100vh-7rem)] pb-20 md:pb-24">
        <div className="relative z-10 mx-auto mt-5 bg-white text-gray-400 p-6 rounded-sm">
          {/* 予約枠の警告メッセージ（ユーザーが時間枠を選択していない場合のみ表示） */}
          {!checkingSlots && availableSlotsCount === 0 && !dispatchDate && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-800 font-semibold mb-1">
                    現在、予約可能な時間枠がありません
                  </p>
                  <p className="text-red-700">
                    後日、再度ご確認下さい。空き枠が出る場合もあります。
                  </p>
                  <p className="text-red-600 mt-2 text-xs">
                    ※ 商品の確認は可能ですが、現時点では予約はできません。
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 予約枠が少ない場合の通知（ユーザーが時間枠を選択していない場合のみ表示） */}
          {!checkingSlots && availableCapacityTotal !== null && availableCapacityTotal > 0 && availableCapacityTotal <= 5 && !dispatchDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-800">
                    予約可能な時間枠は残り{availableCapacityTotal}枠になりました。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto mb-6">
            {mounted && (
              <button 
                onClick={() => router.push(`/online-shop/dispatch`)}
                className="w-full border-2 p-3 text-center hover:bg-gray-50 transition-colors"
              >
                {dispatchDate && dispatchTime ? (
                  <DateTimeDisplay date={dispatchDate} time={dispatchTime} />
                ) : (
                  "予約日時を選択してください"
                )}
              </button>
            )}
          </div>

          <div className="flex border-b sm:border-b-0  max-w-4xl mx-auto ">
            <div className=" border-b-2 pl-4">
              <button className="font-medium text-2xl text-gray-400">BAGEL(税込価格)</button>
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
          disabled={availableSlotsCount === 0 && !dispatchDate}
        />
      )}
    </>
  );
}

function CartFooter({
  totalQuantity,
  onClick,
  disabled = false,
}: {
  totalQuantity: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const handleClick = async () => {
    // カートボタンクリック時に再度時間枠をチェック
    try {
      const response = await fetch('/api/get-available-slots');
      if (!response.ok) {
        throw new Error('時間枠データの取得に失敗しました');
      }
      const data = await response.json();
      
      // ユーザーが既に選択している時間枠を取得
      const userDispatchDate = useCartStore.getState().dispatchDate;
      const userDispatchTime = useCartStore.getState().dispatchTime;
      
      // 利用可能な時間枠をチェック（ユーザーが選択済みの枠も利用可能とみなす）
      const availableCount = data.timeSlots?.filter((slot: { is_available: boolean; date: string; time: string; max_capacity: number; current_bookings: number; temp_bookings?: number }) => {
        // ユーザーが選択している時間枠の場合は常に利用可能とみなす
        if (userDispatchDate && userDispatchTime && 
            slot.date === userDispatchDate && 
            slot.time.slice(0, 5) === userDispatchTime) {
          return true;
        }
        // それ以外は通常の利用可能性チェック
        return slot.is_available;
      }).length || 0;
      
      if (availableCount === 0 && !userDispatchDate) {
        // ユーザーが時間枠を選択していない場合のみ警告を表示
        alert('申し訳ございません。現在予約可能な時間枠がありません。');
        return;
      }
      
      // 時間枠が利用可能な場合のみカートページへ遷移
      onClick();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('時間枠の確認に失敗しました:', error);
      }
      // エラーの場合も一応カートページへ遷移を許可
      onClick();
    }
  };

  return (
    <div className="fixed bottom-0 w-full bg-white flex justify-center z-20 border-t border-gray-300 md:bottom-4 md:right-4 md:w-auto md:border md:shadow-lg md:rounded-lg">
      <div className="w-full max-w-md px-6 py-3 md:px-4 md:py-2">
        {disabled ? (
          <div className="w-full py-3 bg-gray-400 text-gray-200 text-xl flex items-center justify-center md:px-8 md:py-2 md:text-base cursor-not-allowed">
            予約枠がありません
          </div>
        ) : (
          <button
            onClick={handleClick}
            className="w-full relative py-3 bg-[#887c5d] text-gray-200 hover:bg-gray-600 text-xl flex items-center justify-center md:px-8 md:py-2 md:text-base"
            aria-label="カートを見る"
          >
            カートを見る
            <div className="flex absolute right-6 md:relative md:right-0 md:ml-2">
              <ShoppingBag className="h-5 w-5" />
              {totalQuantity > 0 && (
                <span className="ml-1 w-5 h-5 flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
