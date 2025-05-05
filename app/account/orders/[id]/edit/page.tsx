'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Minus, Plus } from 'lucide-react';

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

// type Order = {
//   items: OrderItem[];
//   dispatch_date: string;
//   dispatch_time: string;
//   shipped: boolean;
// };

export default function EditOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editAllowed, setEditAllowed] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('items, dispatch_date, dispatch_time, shipped')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('注文データの取得に失敗しました');
        return;
      }

      setItems((data.items as OrderItem[]).filter((item) => item.quantity > 0));
      setDispatchDate(data.dispatch_date);
      setDispatchTime(data.dispatch_time);


      // 編集可能かどうかを判定
      const today = new Date();
      const targetDate = new Date(data.dispatch_date);
      targetDate.setDate(targetDate.getDate() - 1); // 2日前まで

      setEditAllowed(!data.shipped && today <= targetDate);

      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  const increase = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrease = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item
      ).filter(item => item.quantity > 0) // 0個のアイテムは除外
    );
  };

  const remove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const total_price = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 10;

    const { error } = await supabase
      .from('orders')
      .update({
        items,
        dispatch_date: dispatchDate,
        dispatch_time: dispatchTime,
        total_price,
      })
      .eq('id', id);

    if (error) {
      alert('保存に失敗しました');
    } else {
      router.push(`/account/orders/${id}`);
    }
  };

  const generateDateOptions = (): string[] => {
    const options: string[] = [];
    const today = new Date();
    for (let i = 2; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push(
        date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
      );
    }
    return options;
  };

  const timeOptions = [
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
  ];

  if (loading) return <div className="p-6 text-center">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!editAllowed) return  (
  <div className="p-6 text-center text-gray-500">
    この注文は編集できません。
  </div>
  );


  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 10;

  return (
    <>
      <main className="min-h-[calc(100vh-7rem)] pb-20 px-6 py-10 bg-white">
        <h1 className="text-3xl mb-8">注文内容の編集</h1>

        {/* 受取日時 */}
        <div className="mb-8 space-y-2">
          <label className="block text-sm text-gray-700">受取日</label>
          <select
            value={dispatchDate}
            onChange={(e) => setDispatchDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {generateDateOptions().map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>

          <label className="block text-sm text-gray-700 mt-4">受取時間</label>
          <select
            value={dispatchTime}
            onChange={(e) => setDispatchTime(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        {items.length > 0 ? (
          <div className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between border-b border-[#887c5d]/60 pb-4">
                <div>
                  <p className="text-lg">{item.name}</p>
                  <button onClick={() => remove(index)} className="pt-5 text-[#887c5d] hover:underline">
                    削除
                  </button>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-lg">
                    ¥{(item.price * item.quantity).toLocaleString()}
                  </div>
                  <div className="flex items-center border-2 border-[#887c5d]/60 w-35 h-10">
                    <button onClick={() => decrease(index)} className="flex-1 flex justify-center items-center">
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="flex-1 text-center text-xl text-gray-400">{item.quantity}</span>
                    <button onClick={() => increase(index)} className="flex-1 flex justify-center items-center">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between text-xl">
              <p>袋代</p>
              <p>¥10</p>
            </div>
            <div className="flex -mt-2 justify-between text-xl">
              <p>合計</p>
              <p>¥{total.toLocaleString()}</p>
            </div>

            <div className="hidden md:flex justify-end mt-8">
              <button
                onClick={save}
                className="w-64 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
              >
                保存 ¥{total.toLocaleString()}
              </button>
            </div>
          </div>
        ) : (
          <p>商品がありません。</p>
        )}
      </main>

      <div className="fixed bottom-0 z-20 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={save}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          保存して戻る
        </button>
      </div>
    </>
  );
}
