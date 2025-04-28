"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
    onClose?: () => void;
    onSave?: (date: string, time: string) => void;
    initialDate?: string; // ←追加
    initialTime?: string; // ←追加
  };
  

  export default function DispatchModal({ onClose, onSave, initialDate = "", initialTime = "" }: Props) {
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [selectedTime, setSelectedTime] = useState<string>(initialTime);
      // 今日から2日後〜7日後までの日付リストを作成
    const dateOptions = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 2);
        return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
    });

    // 10:00〜15:00まで15分刻みのリストを作成
    const timeOptions = Array.from({ length: ((15 - 10) * 4) + 1 }, (_, i) => {
        const totalMinutes = 10 * 60 + i * 15;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    });
  
    const router = useRouter();
    const close = () => (onClose ? onClose() : router.back());
    const addToCart = useCartStore((s) => s.addToCart);
  
    // ――― 初期化（フェードイン & 背景スクロール禁止）
    useEffect(() => {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }, []);
  
    // ――― ハンドラ
    // const add   = () => {
    //   addToCart({ date: , time: , });
    //   close();
    // };
  
    // ――― JSX
    return (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
    
    <div className="flex-1 relative w-full h-full bg-white overflow-y-auto ">
          {/* ✕ */}
          <div>
            <h1 className="text-gray-400 text-center text-3xl p-10">どのように注文を受け取りますか？</h1>
          </div>
          <button
            onClick={close}
            className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-black"
            aria-label="閉じる"
          >
            ✕
          </button>


          {/* 情報 */}
          <div className="p-6 pt-8 text-gray-400 text-xl">
            <h2 className=" mb-1 ">受取場所</h2>
  
            
            <p className="  mb-6">店舗住所</p>
            <p className="  mb-6">お持ち帰り時間</p>
            
  
            {/* 数量 */}
            <div className="my-8 space-y-8">
      {/* 日付 */}
      <div>
        <p className="mb-2 text-gray-400">日付</p>
        <div>
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
      </div>

      {/* 時間 */}
      <div>
        <p className="mb-2 text-gray-400">時間</p>
        <div >
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
      </div>

      {/* 選んだ内容を表示（テスト用） */}
      <div className="pt-6">
        <p>選択した日付: {selectedDate}</p>
        <p>選択した時間: {selectedTime}</p>
      </div>
    </div>

      </div>
    </div>
  
    {/* 固定フッター */}
    <div className="flex w-full max-w-md px-6 py-7 border-t border-gray-300 bg-white space-x-4">
        <button
            className="flex-1 py-5  text-[#887c5d] text-lg hover:bg-gray-600 border border-[#887c5d] text-"
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
    );
  }
  