"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  onClose?: () => void;
  onSave?: (date: string, time: string) => void;
  initialDate?: string;
  initialTime?: string;
};

export default function DispatchModal({ onClose, onSave, initialDate = "", initialTime = "" }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(initialTime);

  const router = useRouter();
  const close = () => (onClose ? onClose() : router.back());

  // 今日から2日後〜7日後までの日付リストを作成
  const dateOptions = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 2);
    return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  });

  // 10:00〜15:00まで15分刻みのリストを作成
  const timeOptions = Array.from({ length: ((15.5 - 11) * 4) + 1 }, (_, i) => {
    const totalMinutes = 11 * 60 + i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={close} // 背景クリックで閉じる
    >
      <div
        className="relative w-full h-full bg-white overflow-y-auto md:w-full md:max-w-lg md:h-auto  md:shadow-lg"
        onClick={(e) => e.stopPropagation()} // モーダル内部クリックで背景クリックを防止
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
        <div className="p-6 pt-14 text-gray-400 text-xl">
          <h1 className="text-center text-3xl mb-8">どのように注文を受け取りますか？</h1>

          <div className="mb-6">
            <h2 className="mb-1">受取場所</h2>
            <p>店舗住所</p>
          </div>

          <div className="mb-6">
            <h2 className="mb-1">お持ち帰り時間</h2>
          </div>

          {/* 日付選択 */}
          <div className="mb-6">
            <p className="mb-2">日付</p>
            <Select value={selectedDate} onValueChange={(value) => setSelectedDate(value)}>
              <SelectTrigger className="w-full items-center border-2 border-gray-300 h-20 text-xl">
                <SelectValue placeholder="日付を選んでください" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((date) => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 時間選択 */}
          <div className="mb-6">
            <p className="mb-2">時間</p>
            <Select value={selectedTime} onValueChange={(value) => setSelectedTime(value)}>
              <SelectTrigger className="w-full items-center border-2 border-gray-300 h-20 text-xl">
                <SelectValue placeholder="時間を選んでください" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* テスト用出力 */}
          <div className="pt-6">
            <p>選択した日付: {selectedDate}</p>
            <p>選択した時間: {selectedTime}</p>
          </div>
        </div>

        {/* フッターボタン */}
{/* スマホ用固定フッター（SPだけ表示） */}
<div className="fixed bottom-0 w-full bg-white border-t border-gray-300 flex md:hidden space-x-4 px-6 py-5 z-50">
  <button
    className="flex-1 py-4 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
    onClick={close}
  >
    キャンセル
  </button>
  <button
    className="flex-1 py-4 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
    onClick={() => {
      if (selectedDate && selectedTime && onSave) {
        onSave(selectedDate, selectedTime);
      }
    }}
  >
    保存
  </button>
</div>

    {/* PC用フッター（PCだけ表示） */}
    <div className="hidden md:flex w-full max-w-lg px-6 py-7 border-t border-gray-300 bg-white space-x-4">
      <button
        className="flex-1 py-5 text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d]"
        onClick={close}
      >
        キャンセル
      </button>
      <button
        className="flex-1 py-5 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        onClick={() => {
          if (selectedDate && selectedTime && onSave) {
            onSave(selectedDate, selectedTime);
          }
        }}
      >
        保存
      </button>
    </div>
      </div>
    </div>
  );
}
