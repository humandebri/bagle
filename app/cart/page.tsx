'use client';

import { useCartStore } from '@/store/cart-store';
import { Minus, Plus, AlertCircle, Calendar, Clock } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { MAX_BAGEL_PER_ITEM, MAX_BAGEL_PER_ITEM_FILLING, getMaxBagelPerOrder } from "@/lib/constants";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import {
  inferSlotCategoryFromProductCategory,
  SLOT_CATEGORY_STANDARD,
  SLOT_CATEGORY_LABELS,
} from '@/lib/categories';
import type { SlotCategory } from '@/lib/categories';

export default function CartPage() {
    
  const items = useCartStore((state) => state.items); 
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0); 
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const dispatchDate = useCartStore((state) => state.dispatchDate);
  const dispatchTime = useCartStore((state) => state.dispatchTime);
  const dispatchEndTime = useCartStore((state) => state.dispatchEndTime);
  const dispatchCategory = useCartStore((state) => state.dispatchCategory);
  
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number | null>(null);
  const [availableCapacityTotal, setAvailableCapacityTotal] = useState<number | null>(null);
  const [checkingSlots, setCheckingSlots] = useState(true);

  const router = useRouter();
  const close = () => {
    router.push('/online-shop');
  };

  const hasSelectedSlot = Boolean(dispatchDate && dispatchTime);

  const effectiveCategory = useMemo<SlotCategory>(() => {
    if (hasSelectedSlot) {
      return dispatchCategory;
    }
    const categories = new Set<SlotCategory>();
    items.forEach((item) => {
      categories.add(
        inferSlotCategoryFromProductCategory(item.category?.name),
      );
    });
    if (categories.size === 0) {
      return SLOT_CATEGORY_STANDARD;
    }
    if (categories.size === 1) {
      return categories.values().next().value as SlotCategory;
    }
    return dispatchCategory;
  }, [hasSelectedSlot, dispatchCategory, items]);

  const effectiveCategoryLabel =
    SLOT_CATEGORY_LABELS[effectiveCategory] ?? SLOT_CATEGORY_LABELS[SLOT_CATEGORY_STANDARD];
  const maxBagelsPerOrder = useMemo(
    () => getMaxBagelPerOrder(effectiveCategory),
    [effectiveCategory],
  );

  // ページロード時に利用可能な時間枠をチェック
  const checkAvailableSlots = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/get-available-slots?category=${encodeURIComponent(effectiveCategory)}`,
      );
      if (!response.ok) {
        throw new Error('時間枠データの取得に失敗しました');
      }
      const data = await response.json();
      
      // 利用可能な時間枠をカウント（ユーザーが選択済みの枠も利用可能とみなす）
      const availableSlots = data.timeSlots?.filter((slot: { is_available: boolean; date: string; time: string; max_capacity: number; current_bookings: number; temp_bookings?: number }) => {
        // ユーザーが選択している時間枠の場合は常に利用可能とみなす
        if (dispatchDate && dispatchTime && 
            slot.date === dispatchDate && 
            slot.time.slice(0, 5) === dispatchTime) {
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
  }, [dispatchDate, dispatchTime, effectiveCategory]);

  useEffect(() => {
    checkAvailableSlots();
  }, [checkAvailableSlots]);

  const handleCheckout = async () => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity > maxBagelsPerOrder) {
      toast.error(`予約できる個数は最大${maxBagelsPerOrder}個までです！`, {
        description: `お一人様${maxBagelsPerOrder}個までご予約いただけます。`,
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
        router.push('/dispatch');
        return;
      }

      router.push('/checkout');
    } catch {
      toast.error("エラーが発生しました", {
        description: "もう一度お試しください。",
      });
    }
  };

  return (
    <>
    <main className="min-h-[calc(100vh-7rem)] pb-24 md:pb-8 px-4 md:px-6 py-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6">Cart</h1>
        <button
          onClick={close}
          className="absolute top-25 right-4 text-3xl text-gray-400 hover:text-black md:hidden"
          aria-label="閉じる"
        >
          ✕
        </button>

        <div className="md:grid md:grid-cols-12 md:gap-8">
          {/* Left: 内容 */}
          <div className="md:col-span-7 lg:col-span-8">
            {/* 予約枠の警告メッセージ */}
            {!checkingSlots && availableSlotsCount === 0 && !dispatchDate && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-800 font-semibold mb-1">
                      現在、{effectiveCategoryLabel}の予約可能な時間枠がありません
                    </p>
                    <p className="text-red-700">
                      後日、再度ご確認下さい。空き枠が出る場合もあります。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 予約枠が少ない場合の通知 */}
            {!checkingSlots && availableCapacityTotal !== null && availableCapacityTotal > 0 && availableCapacityTotal <= 5 && !dispatchDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-amber-800">
                      {effectiveCategoryLabel}の予約可能な時間枠は残り{availableCapacityTotal}枠になりました。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 予約日時の表示 */}
            {dispatchDate && dispatchTime && (
              <button
                onClick={() => router.push('/dispatch')}
                className="w-full border-2 border-[#887c5d]/60 p-4 mb-6 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-[#887c5d]">
                  <Calendar className="w-5 h-5" />
                <DateTimeDisplay
                  date={dispatchDate}
                  time={dispatchTime}
                  endTime={dispatchEndTime}
                  className="text-base"
                />
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
                    onClick={() => router.push('/dispatch')}
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
                  <div key={item.id} className="flex justify-between border-b border-[#887c5d]/60 pb-4">
                    {/* 左側：商品情報 */}
                    <div>
                      <p className="text-lg">{item.name}</p>
                      <button onClick={() => removeItem(item.id)} className="pt-2 text-[#887c5d] hover:underline">削除</button>
                    </div>

                    {/* 右側：金額と数量ボタン */}
                    <div className="flex flex-col items-end gap-2">
                      {/* 金額 */}
                      <div className="text-lg">¥{(item.price * item.quantity).toLocaleString()}</div>

                      {/* 数量ボタン */}
                      <div className="flex items-center border-2 border-[#887c5d]/60 w-35 h-10">
                        <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="flex-1 flex justify-center items-center">
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="flex-1 text-center text-xl text-gray-400">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const maxPerItem = item.category?.name === 'フィリングベーグル' ? MAX_BAGEL_PER_ITEM_FILLING : MAX_BAGEL_PER_ITEM;
                            if (item.quantity >= maxPerItem) {
                              toast.error(`1つの商品は最大${maxPerItem}個までです！`, {
                                description: `${item.category?.name === 'フィリングベーグル' ? 'フィリングベーグルは' : 'お一人様1つの商品につき'}${maxPerItem}個までご予約いただけます。`,
                              });
                              return;
                            }
                            updateQuantity(item.id, item.quantity + 1);
                          }}
                          className="flex-1 flex justify-center items-center"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>カートに商品がありません。</p>
            )}
          </div>

          {/* Right: サマリー */}
          <aside className="md:col-span-5 lg:col-span-4">
            <div className="hidden md:block sticky top-4">
              <div className="border rounded-md p-4 bg-white shadow-sm">
                <h3 className="text-lg font-medium mb-3">ご注文内容</h3>
                <div className="space-y-2 text-sm text-gray-700 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">受取日時</span>
                    <span className="font-medium">
                      {dispatchDate && dispatchTime ? (
                        <DateTimeDisplay
                          date={dispatchDate}
                          time={dispatchTime}
                          endTime={dispatchEndTime}
                        />
                      ) : (
                        '未選択'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">商品数</span>
                    <span className="font-medium">{items.reduce((s, it) => s + it.quantity, 0)} 個</span>
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between text-base">
                  <span className="font-medium">合計</span>
                  <span className="font-semibold">¥{totalAmount.toLocaleString()}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={availableSlotsCount === 0 && !dispatchDate}
                  className={`mt-4 w-full py-3 text-white text-base rounded-md ${
                    availableSlotsCount === 0 && !dispatchDate
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[#887c5d] hover:bg-[#6f6550]'
                  }`}
                >
                  {availableSlotsCount === 0 && !dispatchDate ? '予約枠がありません' : '注文手続きに進む'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
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
