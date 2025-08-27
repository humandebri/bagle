'use client';

import { useCartStore } from '@/store/cart-store';
import { Minus, Plus, AlertCircle, Calendar, Clock } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { MAX_BAGEL_PER_ITEM, MAX_BAGEL_PER_ITEM_FILLING, MAX_BAGEL_PER_ORDER } from "@/lib/constants";
import { useEffect, useState, useCallback } from 'react';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';




export default function CartPage() {
    
  const items = useCartStore((state) => state.items); 
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0); 
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const dispatchDate = useCartStore((state) => state.dispatchDate);
  const dispatchTime = useCartStore((state) => state.dispatchTime);
  
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number | null>(null);
  const [checkingSlots, setCheckingSlots] = useState(true);

  const router = useRouter();
  const close = () => {
    router.push('/online-shop');
  };

  // ページロード時に利用可能な時間枠をチェック
  const checkAvailableSlots = useCallback(async () => {
    try {
      const response = await fetch('/api/get-available-slots');
      if (!response.ok) {
        throw new Error('時間枠データの取得に失敗しました');
      }
      const data = await response.json();
      
      // 利用可能な時間枠をカウント（ユーザーが選択済みの枠も利用可能とみなす）
      const availableCount = data.timeSlots?.filter((slot: { is_available: boolean; date: string; time: string }) => {
        // ユーザーが選択している時間枠の場合は常に利用可能とみなす
        if (dispatchDate && dispatchTime && 
            slot.date === dispatchDate && 
            slot.time.slice(0, 5) === dispatchTime) {
          return true;
        }
        // それ以外は通常の利用可能性チェック
        return slot.is_available;
      }).length || 0;
      
      setAvailableSlotsCount(availableCount);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('時間枠データの取得に失敗しました:', error);
      }
      setAvailableSlotsCount(0);
    } finally {
      setCheckingSlots(false);
    }
  }, [dispatchDate, dispatchTime]);

  useEffect(() => {
    checkAvailableSlots();
  }, [checkAvailableSlots]);

  const handleCheckout = async () => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity > MAX_BAGEL_PER_ORDER) {
      toast.error(`予約できる個数は最大${MAX_BAGEL_PER_ORDER}個までです！`, {
        description: `お一人様${MAX_BAGEL_PER_ORDER}個までご予約いただけます。`,
      });
      return;
    }

    if (totalQuantity === 0) {
      toast.error("カートに商品がありません。", {
        description: "商品を追加してください。",
      });
      return;
    }

    // 日時が選択されているかチェック
    if (!dispatchDate || !dispatchTime) {
      toast.error("予約日時を選択してください", {
        description: "商品を受け取る日時を選択してからお進みください。",
      });
      return;
    }

    // 時間枠の有効性をチェック
    // 時間を "12:00" 形式に統一（"12:00:00" の場合は切り詰め）
    const normalizedTime = dispatchTime.length === 8 ? dispatchTime.slice(0, 5) : dispatchTime;
    
    try {
      const response = await fetch('/api/validate-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: dispatchDate, 
          time: normalizedTime,
          isUserSelection: true // This is the user's current cart selection
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        toast.error("選択された時間枠は利用できません", {
          description: result.message,
        });
        // 無効な時間枠の場合、日時選択画面へ誘導
        router.push('/online-shop/dispatch');
        return;
      }

      router.push('/online-shop/checkout');
    } catch {
      toast.error("エラーが発生しました", {
        description: "もう一度お試しください。",
      });
    }
  };

  return (
    <>
    <main className="min-h-[calc(100vh-7rem)] pb-20 md:pb-5 px-6 py-10 bg-white">
      <h1 className="text-3xl  mb-8">Cart </h1>
      <button
          onClick={close}
          className="absolute top-25 right-4 text-3xl text-gray-400 hover:text-black md:hidden"
          aria-label="閉じる"
        >
          ✕
        </button>

      {/* 予約枠の警告メッセージ（ユーザーが時間枠を選択していない場合のみ表示） */}
      {!checkingSlots && availableSlotsCount === 0 && !dispatchDate && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-red-800 font-semibold mb-1">
                現在、予約可能な時間枠がありません
              </p>
              <p className="text-red-700">
                後日、再度ご確認下さい。空き枠が出る場合もあります。
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 予約枠が少ない場合の警告（ユーザーが時間枠を選択していない場合のみ表示） */}
      {!checkingSlots && availableSlotsCount !== null && availableSlotsCount > 0 && availableSlotsCount <= 3 && !dispatchDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-800 font-semibold">
                残りわずか！予約可能な時間枠は残り{availableSlotsCount}枠です
              </p>
              <p className="text-amber-700">
                お早めのご予約をおすすめします。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 予約日時の表示 */}
      {dispatchDate && dispatchTime && (
        <button 
          onClick={() => router.push('/online-shop/dispatch')}
          className="w-full border-2 border-[#887c5d]/60 p-4 mb-6 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-[#887c5d]">
            <Calendar className="w-5 h-5" />
            <DateTimeDisplay date={dispatchDate} time={dispatchTime} className="text-base" />
          </div>
        </button>
      )}

      {/* 予約日時が未選択の場合の警告 */}
      {!dispatchDate && !dispatchTime && items.length > 0 && (
        <div className="border-2 border-amber-500/60 p-4 mb-6 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="w-5 h-5" />
            <span className="text-base">予約日時を選択してください</span>
            <button 
              onClick={() => router.push('/online-shop/dispatch')}
              className="ml-auto text-sm underline hover:no-underline"
            >
              選択する
            </button>
          </div>
        </div>
      )}

      {/* 商品リスト */}
      {items.length > 0 ? (
        <div className="space-y-6">
          {items.filter(item => item.quantity > 0).map((item) => (
            <div key={item.id} className="flex justify-between border-b border-[#887c5d]/60  pb-4">
                {/* 左側：商品情報 */}
                <div>
                <p className="text-lg">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="pt-5 text-[#887c5d] hover:underline">
                    削除
                </button>
                </div>

                {/* 右側：金額と数量ボタン */}
                <div className="flex flex-col items-end gap-2">
                {/* 金額 */}
                <div className="text-lg">
                    ¥{(item.price * item.quantity).toLocaleString()}
                </div>

                {/* 数量ボタン */}
                <div className="flex items-center border-2 border-[#887c5d]/60 w-35 h-10">
                <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="flex-1 flex justify-center items-center">
                <Minus className="w-5 h-5" />
                </button>

                <span className="flex-1 text-center text-xl text-gray-400">{item.quantity}</span>

                <button onClick={() => {
                  // カテゴリーに応じた制限値を設定
                  const maxPerItem = item.category?.name === 'フィリングベーグル' 
                    ? MAX_BAGEL_PER_ITEM_FILLING 
                    : MAX_BAGEL_PER_ITEM;
                  
                  if (item.quantity >= maxPerItem) {
                    toast.error(`1つの商品は最大${maxPerItem}個までです！`, {
                      description: `${item.category?.name === 'フィリングベーグル' ? 'フィリングベーグルは' : 'お一人様1つの商品につき'}${maxPerItem}個までご予約いただけます。`,
                    });
                    return;
                  }
                  updateQuantity(item.id, item.quantity + 1);
                }} className="flex-1 flex justify-center items-center">
                <Plus className="w-5 h-5" />
                </button>
                </div>
                </div>
            </div>
            ))}
                    

          {/* 合計金額 */}
          <div className="flex justify-between text-xl mt-6">
            <p>合計</p>
            <p>¥{totalAmount.toLocaleString()}</p>
          </div>

        <div className="hidden md:flex justify-end mt-8">
            <button
                onClick={handleCheckout}
                disabled={availableSlotsCount === 0 && !dispatchDate}
                className={`flex-shrink-0 w-64 py-4 px-6 text-lg ${
                  availableSlotsCount === 0 && !dispatchDate
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-[#887c5d] text-gray-200 hover:bg-gray-600'
                }`}
            >
                {availableSlotsCount === 0 && !dispatchDate ? '予約枠がありません' : '注文手続きに進む'}
            </button>
          </div>
        </div>
      ) : (
        <p >カートに商品がありません。</p>
      )}
    </main>
        <div className="fixed bottom-0 z-20 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={handleCheckout}
          disabled={availableSlotsCount === 0 && !dispatchDate}
          className={`w-full py-3 text-lg ${
            availableSlotsCount === 0 && !dispatchDate
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-[#887c5d] text-gray-200 hover:bg-gray-600'
          }`}
        >
          {availableSlotsCount === 0 && !dispatchDate ? '予約枠がありません' : '注文手続きに進む'}
        </button>
      </div>
    </>
  );
}
