'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCartStore } from '@/store/cart-store';
import { useMenuStore } from '@/store/menu-store';
import { TimeSlot } from '@/lib/supabase-server';
import {
  normalizeSlotCategory,
  SLOT_CATEGORY_RICE_FLOUR,
} from '@/lib/categories';
import { RemoveScroll } from 'react-remove-scroll';
import { createPortal } from 'react-dom';

type DateOption = { iso: string; label: string };

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function DispatchModalPage() {
  const router = useRouter();
  const dispatchDate = useCartStore((s) => s.dispatchDate);           // ISO yyyy‑mm‑dd
  const dispatchTime = useCartStore((s) => s.dispatchTime);           // '11:00' など
  const setDispatchDate = useCartStore((s) => s.setDispatchDate);
  const setDispatchTime = useCartStore((s) => s.setDispatchTime);
  const dispatchCategory = useCartStore((s) => s.dispatchCategory);
  const setDispatchCategory = useCartStore((s) => s.setDispatchCategory);
  const activeCategory = useMenuStore((s) => s.activeCategory);
  const setActiveCategory = useMenuStore((s) => s.setActiveCategory);

  const [selectedDate, setSelectedDate] = useState<string>(dispatchDate || '');
  const toSelectTimeValue = (time: string | null) =>
    time ? (time.length === 5 ? `${time}:00` : time) : '';
  const [selectedTime, setSelectedTime] = useState<string>(
    toSelectTimeValue(dispatchTime),
  );

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    if (dispatchCategory === SLOT_CATEGORY_RICE_FLOUR) {
      setActiveCategory(SLOT_CATEGORY_RICE_FLOUR);
    }
  }, [dispatchCategory, setActiveCategory]);

  const TIME_RANGE_MAP = {
    '11:00': '11:15',
    '11:15': '11:30',
    '11:30': '11:45',
    '11:45': '12:00',
    '12:00': '15:00',
  };
  type TimeRangeKey = keyof typeof TIME_RANGE_MAP;

  /** 日付を日本語形式に変換 */
  function formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        return '日付を選んでください';
      }
      return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return '日付を選んでください';
    }
  }

  function formatTimeRange(startTime: string): string {
    const start = startTime.slice(0, 5) as TimeRangeKey; // 明示的にキーであると伝える
    const end = TIME_RANGE_MAP[start];
    return end ? `${start} - ${end}` : start;
  }

  /** 予約枠を取得 */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/get-available-slots?category=${encodeURIComponent(activeCategory)}`,
        );
        if (!res.ok) {
          throw new Error('時間枠データの取得に失敗しました');
        }
        const payload = await res.json();
        const fetchedSlots: TimeSlot[] = payload.timeSlots || [];
        setTimeSlots(fetchedSlots);

        const isoDates = Array.from(
          new Set(
            fetchedSlots
              .filter((s: TimeSlot) => s.is_available)
              .map((s: TimeSlot) => s.date),
          ),
        ) as string[];

        setAvailableDates(
          isoDates.map((iso) => ({
            iso,
            label: formatDate(iso),
          })),
        );

        if (selectedDate && !isoDates.includes(selectedDate)) {
          setSelectedDate('');
          setSelectedTime('');
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
        setTimeSlots([]);
        setAvailableDates([]);
        setAvailableTimes([]);
      }
    })();
  }, [activeCategory, selectedDate]);

  /** 日付が決まったら時間リストを作る */
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      return;
    }

    const times = timeSlots
      .filter((s) => s.date === selectedDate && s.is_available)
      .map((s) => s.time);

    setAvailableTimes(times);
    if (selectedTime && !times.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedDate, selectedTime, timeSlots]);

  // 背景スクロールロックはライブラリに委譲（react-remove-scroll）

  const close = () => {
    try {
      sessionStorage.setItem('online-shop-scroll', String(window.scrollY));
      window.dispatchEvent(new Event('online-shop:modal-closed'));
    } catch {}
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/online-shop', { scroll: false });
  };

  const save = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      const res = await fetch('/api/update-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time: selectedTime }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || '予約枠の更新に失敗しました');
        return;
      }

      const matchedSlot = timeSlots.find(
        (slot) =>
          slot.date === selectedDate &&
          slot.time.slice(0, 5) === selectedTime.slice(0, 5),
      );
      const slotCategory = matchedSlot
        ? normalizeSlotCategory(matchedSlot.allowed_category)
        : normalizeSlotCategory(activeCategory);

      setDispatchDate(selectedDate); // Zustand に保存
      // 時間を "10:00:00" から "10:00" 形式に変換して保存
      setDispatchTime(selectedTime.slice(0, 5)); // Zustand に保存
      setDispatchCategory(slotCategory);
      setActiveCategory(slotCategory);
      router.back();
    } catch (err) {
      console.error('Error updating time slot:', err);
      alert('予約枠の更新に失敗しました');
    }
  };

  /* ---------- JSX (省略なしで掲載) ---------- */
  return (
    <Portal>
      <RemoveScroll>
        {/* overlay */}
        <div className="fixed inset-0 z-[9999] bg-black/50" onClick={close} aria-hidden="true" />
        {/* panel */}
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          onClick={close}
        >
          <div
            className="relative mx-auto w-full max-w-lg bg-white overflow-y-auto max-h-screen touch-pan-y overscroll-contain md:max-h-none md:h-auto md:rounded-lg md:shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
        {/* ✕ボタン */}
        <button
          onClick={close}
          className="absolute top-2 right-4 text-3xl text-gray-400 hover:text-black"
          aria-label="閉じる"
        >
          ✕
        </button>

        {/* コンテンツ */}
        <div className="px-6 pt-14 pb-28 md:pb-0 text-gray-400 text-xl">
          <h1 className="text-center text-2xl mb-8">
            注文日時を選択してください
          </h1>

          <div className="mb-6">
            <h2 className="mb-1">受取場所 : 店舗住所</h2>
            <p className="text-md  mt-2"></p>
          </div>

          <div className="mb-6">
            <h2 className="mb-1">お持ち帰り時間</h2>
            <p className="text-sm text-gray-500 mt-2">
              ※ 各日の予約は1週間前の同じ曜日0時から開始されます（当日・翌日予約不可）
            </p>
          </div>

          {/* 日付選択 */}
          <div className="mb-6">
            <p className="mb-2">日付</p>
            <Select
              value={selectedDate}
              onValueChange={(v) => setSelectedDate(v)}
            >
              <SelectTrigger className="w-full items-center border-2 border-gray-300 h-20 text-xl">
                <SelectValue placeholder="日付を選択してください">
                  {selectedDate ? formatDate(selectedDate) : "お持ち帰り日時を選択してください"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableDates.length > 0 ? (
                  availableDates.map(({ iso, label }) => (
                    <SelectItem key={iso} value={iso}>
                      {label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    現在予約可能な日付がありません
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 時間選択 */}
          <div className="mb-6">
            <p className="mb-2">時間</p>
            <Select
              value={selectedTime}
              onValueChange={(v) => setSelectedTime(v)}
            >
              <SelectTrigger className="w-full items-center border-2 border-gray-300 h-20 text-xl">
                <SelectValue placeholder="時間を選択してください">
                  {selectedTime ? formatTimeRange(selectedTime) : "お持ち帰り日時を選択してください"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTimeRange(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* スマホ固定フッターはモーダル外に配置 */}

        {/* PC用フッター */}
        <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4">
          <button
            className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
            onClick={close}
          >
            キャンセル
          </button>
          <button
            className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
            onClick={save}
          >
            保存
          </button>
        </div>
          </div>
        </div>
        {/* スマホ固定フッター（モーダル外・最前面） */}
        <div className="md:hidden z-[10001] fixed bottom-0 w-full bg-white border-t border-gray-300 flex space-x-4 px-6 py-5">
          <button
            className="flex-1 py-3 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
            onClick={close}
          >
            キャンセル
          </button>
          <button
            className="flex-1 py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
            onClick={save}
          >
            保存
          </button>
        </div>
      </RemoveScroll>
    </Portal>
  );
}
