'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import BagelMenu from '@/components/BagelMenu';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { Bagel } from '@/components/BagelCard';
import { useMenuStore } from '@/store/menu-store';
import {
  SLOT_CATEGORY_LABELS,
  SLOT_CATEGORY_RICE_FLOUR,
  SLOT_CATEGORY_STANDARD,
  SlotCategory,
  ALLOWED_SLOT_CATEGORIES,
  inferSlotCategoryFromProductCategory,
} from '@/lib/categories';

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

type AvailableSlot = {
  is_available: boolean;
  date: string;
  time: string;
  max_capacity: number;
  current_bookings: number;
  temp_bookings?: number;
};

function convertToBagels(products: Product[]): Bagel[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    longDescription: product.long_description,
    price: product.price,
    image: product.image && product.image !== '' ? product.image : undefined,
    image_webp: product.image_webp || undefined,
    tags: product.is_available ? [] : ['販売停止中'],
  }));
}

export default function OnlineShopPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number | null>(null);
  const [availableCapacityTotal, setAvailableCapacityTotal] = useState<number | null>(null);
  const [checkingSlots, setCheckingSlots] = useState(true);
  const [slotValidationMessage, setSlotValidationMessage] = useState<string | null>(null);
  
  const cartItems = useCartStore((s) => s.items);
  const totalQuantity = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const dispatchDate = useCartStore((s) => s.dispatchDate);
  const dispatchTime = useCartStore((s) => s.dispatchTime);
  const dispatchEndTime = useCartStore((s) => s.dispatchEndTime);
  const dispatchCategory = useCartStore((s) => s.dispatchCategory);
  const setDispatchDate = useCartStore((s) => s.setDispatchDate);
  const setDispatchCategory = useCartStore((s) => s.setDispatchCategory);
  const activeCategory = useMenuStore((s) => s.activeCategory);
  const setActiveCategory = useMenuStore((s) => s.setActiveCategory);
  const activeCategoryRef = useRef<SlotCategory>(activeCategory);

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

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    if (
      dispatchCategory === SLOT_CATEGORY_RICE_FLOUR &&
      activeCategory !== SLOT_CATEGORY_RICE_FLOUR
    ) {
      setActiveCategory(SLOT_CATEGORY_RICE_FLOUR);
    }
  }, [dispatchCategory, activeCategory, setActiveCategory]);

  const checkAvailableSlots = useCallback(
    async (category: SlotCategory) => {
      setCheckingSlots(true);
      try {
        const response = await fetch(
          `/api/get-available-slots?category=${encodeURIComponent(category)}`,
        );
        if (!response.ok) {
          throw new Error('時間枠データの取得に失敗しました');
        }
        const data = await response.json();

        const userDispatchDate = dispatchDate;
        const userDispatchTime = dispatchTime;
        const userDispatchCategory = dispatchCategory;

        const hasUserSelection = Boolean(userDispatchDate && userDispatchTime);

        let shouldResetSelection = false;

        if (hasUserSelection) {
          const matchingSlot = data.timeSlots?.find(
            (slot: AvailableSlot) =>
              slot.date === userDispatchDate &&
              slot.time.slice(0, 5) === userDispatchTime,
          );

          const remainingCapacity = matchingSlot
            ? Math.max(
                0,
                matchingSlot.max_capacity -
                  matchingSlot.current_bookings -
                  (matchingSlot.temp_bookings ?? 0),
              )
            : 0;

          const slotStillBookable =
            Boolean(matchingSlot) &&
            (matchingSlot.is_available || remainingCapacity > 0);

          shouldResetSelection = !slotStillBookable;
        }

        const availableSlots =
          data.timeSlots?.filter((slot: AvailableSlot) => {
            if (
              userDispatchDate &&
              userDispatchTime &&
              slot.date === userDispatchDate &&
              slot.time.slice(0, 5) === userDispatchTime
            ) {
              return true;
            }
            return slot.is_available;
          }) || [];

        if (activeCategoryRef.current !== category) return;

        if (shouldResetSelection && hasUserSelection) {
          setSlotValidationMessage((prev) =>
            prev ??
            '以前に選択された予約枠は満席になったためリセットされました。',
          );
          setDispatchDate(null);
          if (userDispatchCategory) {
            setDispatchCategory(userDispatchCategory);
          }
        } else if (!shouldResetSelection && hasUserSelection) {
          setSlotValidationMessage((prev) => (prev ? null : prev));
        }

        setAvailableSlotsCount(availableSlots.length);

        const totalCapacity = availableSlots.reduce(
          (
            sum: number,
            slot: {
              max_capacity: number;
              current_bookings: number;
              temp_bookings?: number;
            },
          ) => {
            const remainingCapacity = Math.max(
              0,
              slot.max_capacity -
                slot.current_bookings -
                (slot.temp_bookings ?? 0),
            );
            return sum + remainingCapacity;
          },
          0,
        );
        setAvailableCapacityTotal(totalCapacity);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('時間枠データの取得に失敗しました:', error);
        }
        if (activeCategoryRef.current !== category) return;
        setAvailableSlotsCount(0);
        setAvailableCapacityTotal(0);
      } finally {
        if (activeCategoryRef.current === category) {
          setCheckingSlots(false);
        }
      }
    },
    [
      dispatchDate,
      dispatchTime,
      dispatchCategory,
      setDispatchDate,
      setDispatchCategory,
    ],
  );

  useEffect(() => {
    setMounted(true);

    // ブラウザの自動復元を止める
    let prevVal: ScrollRestoration | undefined;
    try {
      if ('scrollRestoration' in history) {
        const hist = history as History & { scrollRestoration?: ScrollRestoration };
        prevVal = hist.scrollRestoration;
        hist.scrollRestoration = 'manual';
      }
    } catch {}

    const restoreFromSession = () => {
      try {
        const yStr = sessionStorage.getItem('online-shop-scroll');
        if (!yStr) return;

        // CSSの smooth スクロールの影響を回避
        const html = document.documentElement as HTMLElement;
        const prevScrollBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';

        const target = Math.max(0, parseInt(yStr, 10) || 0);
        let tries = 0;

        const tick = () => {
          window.scrollTo(0, target);
          tries += 1;
          // 画像レイアウトの揺れ対策：最大10フレーム粘る
          if (Math.abs(window.scrollY - target) > 1 && tries < 10) {
            requestAnimationFrame(tick);
          } else {
            sessionStorage.removeItem('online-shop-scroll');
            // 元に戻す
            html.style.scrollBehavior = prevScrollBehavior;
          }
        };
        requestAnimationFrame(tick);
      } catch {}
    };

    const onPopState = () => restoreFromSession();
    const onModalClosed = () => restoreFromSession();

    window.addEventListener('popstate', onPopState);
    window.addEventListener('online-shop:modal-closed', onModalClosed as EventListener);

    // フォールバック：push で閉じた場合にも効くよう、初回マウントで一度復元を試す
    restoreFromSession();

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('online-shop:modal-closed', onModalClosed as EventListener);
      try {
        if ('scrollRestoration' in history) {
          const hist = history as History & { scrollRestoration?: ScrollRestoration };
          hist.scrollRestoration = prevVal ?? 'auto';
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    checkAvailableSlots(activeCategory);

    const interval = setInterval(() => {
      checkAvailableSlots(activeCategoryRef.current);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeCategory, checkAvailableSlots]);

  const categorizedProducts = useMemo(
    () =>
      products.reduce(
        (acc, product) => {
          const slotCategory = inferSlotCategoryFromProductCategory(
            product.category?.name,
          );
          acc[slotCategory].push(product);
          return acc;
        },
        {
          [SLOT_CATEGORY_STANDARD]: [] as Product[],
          [SLOT_CATEGORY_RICE_FLOUR]: [] as Product[],
        },
      ),
    [products],
  );

  const lockToRiceCategory = dispatchCategory === SLOT_CATEGORY_RICE_FLOUR;
  const bagelsForDisplay = useMemo(
    () => convertToBagels(categorizedProducts[activeCategory] ?? []),
    [categorizedProducts, activeCategory],
  );
  const activeCategoryLabel = SLOT_CATEGORY_LABELS[activeCategory];

  const handleTabClick = (category: SlotCategory) => {
    if (lockToRiceCategory && category !== SLOT_CATEGORY_RICE_FLOUR) {
      return;
    }
    if (category === activeCategory) return;
    setActiveCategory(category);
  };

  // App Routerの経路変更（popstateが飛ばない場合）でも復元
  useEffect(() => {
    // モーダルを閉じて一覧に戻った瞬間のみ走らせる
    if (pathname !== '/online-shop') return;
    if (loading) return;
    // 一覧のDOMと商品データが揃ってから復元
    try {
      const yStr = sessionStorage.getItem('online-shop-scroll');
      if (!yStr) return;

      const html = document.documentElement as HTMLElement;
      const prevScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';

      const target = Math.max(0, parseInt(yStr, 10) || 0);
      let tries = 0;
      const tick = () => {
        window.scrollTo(0, target);
        tries += 1;
        if (Math.abs(window.scrollY - target) > 1 && tries < 10) {
          requestAnimationFrame(tick);
        } else {
          sessionStorage.removeItem('online-shop-scroll');
          html.style.scrollBehavior = prevScrollBehavior;
        }
      };
      requestAnimationFrame(tick);
    } catch {}
  }, [pathname, loading, products.length]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)]">読み込み中...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-7rem)] text-red-500">{error}</div>;
  }

  return (
    <>
      <main className="min-h-[calc(100vh-7rem)] pb-20 md:pb-24">
        <div className="mx-auto bg-white p-6 text-gray-600 rounded-sm">

          {/* 予約枠の警告メッセージ（ユーザーが時間枠を選択していない場合のみ表示） */}
          {!checkingSlots && availableSlotsCount === 0 && !dispatchDate && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-800 font-semibold mb-1">
                    現在、{activeCategoryLabel}の予約可能な時間枠がありません
                  </p>
                  {activeCategory === SLOT_CATEGORY_STANDARD ? (
                    <p className="text-red-700">
                      米粉ベーグル営業日の可能性があります。「米粉ベーグル」タブもご確認ください。
                    </p>
                  ) : (
                    <p className="text-red-700">
                      後日、再度ご確認下さい。空き枠が出る場合もあります。
                    </p>
                  )}
                  <p className="text-red-600 mt-2 text-xs">
                    ※ 商品の確認は可能ですが、現時点では予約はできません。
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 予約枠が少ない場合の通知（ユーザーが時間枠を選択していない場合のみ表示） */}
          {!checkingSlots &&
            availableCapacityTotal !== null &&
            availableCapacityTotal > 0 &&
            availableCapacityTotal <= 5 &&
            !dispatchDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-800">
                    {activeCategoryLabel}の予約可能な時間枠は残り{availableCapacityTotal}枠になりました。
                  </p>
                </div>
              </div>
            </div>
          )}

          {slotValidationMessage && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p>{slotValidationMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto mb-6">
            {mounted && (
              <button 
                onClick={() => {
                  try {
                    sessionStorage.setItem('online-shop-scroll', String(window.scrollY));
                  } catch {}
                  router.push(`/online-shop/dispatch`, { scroll: false });
                }}
                className="w-full border-2 p-3 text-center hover:bg-gray-50 transition-colors"
              >
                {dispatchDate && dispatchTime ? (
                  <DateTimeDisplay
                    date={dispatchDate}
                    time={dispatchTime}
                    endTime={dispatchEndTime}
                  />
                ) : (
                  "予約日時を選択してください"
                )}
              </button>
            )}
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex border-b sm:border-b-0">
              {ALLOWED_SLOT_CATEGORIES.map((category) => {
                const isActive = activeCategory === category;
                const disabled =
                  lockToRiceCategory && category !== SLOT_CATEGORY_RICE_FLOUR;
                return (
                  <button
                    key={category}
                    onClick={() => handleTabClick(category)}
                    disabled={disabled}
                    className={[
                      'px-4 pb-2 text-2xl font-medium transition-colors',
                      isActive
                        ? 'border-b-2 border-[#887c5d] text-gray-600'
                        : 'text-gray-400 hover:text-gray-600',
                      disabled ? 'cursor-not-allowed opacity-60' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {SLOT_CATEGORY_LABELS[category]}
                  </button>
                );
              })}
            </div>
            {lockToRiceCategory && (
              <p className="mt-2 text-xs text-red-500">
                米粉ベーグル営業日は米粉ベーグルのみご予約いただけます。
              </p>
            )}
          </div>

          <div className="max-w-4xl mx-auto">
            {bagelsForDisplay.length > 0 ? (
              <BagelMenu bagels={bagelsForDisplay} />
            ) : (
              <p className="py-12 text-center text-sm text-gray-400">
                現在このカテゴリの商品はありません。
              </p>
            )}
          </div>
        </div>
      </main>

      {mounted && totalQuantity > 0 && (
        <CartFooter
          totalQuantity={totalQuantity}
          onClick={() => router.push('/cart')}
          disabled={availableSlotsCount === 0 && !dispatchDate}
          activeCategory={activeCategory}
        />
      )}
    </>
  );
}

function CartFooter({
  totalQuantity,
  onClick,
  disabled = false,
  activeCategory,
}: {
  totalQuantity: number;
  onClick: () => void;
  disabled?: boolean;
  activeCategory: SlotCategory;
}) {
  const handleClick = async () => {
    // カートボタンクリック時に再度時間枠をチェック
    try {
      const {
        dispatchDate: userDispatchDate,
        dispatchTime: userDispatchTime,
        dispatchCategory,
      } = useCartStore.getState();

      const categoryForCheck = dispatchCategory ?? activeCategory;

      const response = await fetch(
        `/api/get-available-slots?category=${encodeURIComponent(categoryForCheck)}`,
      );
      if (!response.ok) {
        throw new Error('時間枠データの取得に失敗しました');
      }
      const data = await response.json();
      
      // ユーザーが既に選択している時間枠を取得
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
