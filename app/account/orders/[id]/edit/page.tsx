'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";

import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Minus, Plus } from 'lucide-react';
import { TimeSlot } from '@/lib/supabase-server';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCartStore } from '@/store/cart-store';

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

type DateOption = { iso: string; label: string };

export default function EditOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editAllowed, setEditAllowed] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const TIME_RANGE_MAP = {
    '11:00': '11:15',
    '11:15': '11:30',
    '11:30': '11:45',
    '11:45': '12:00',
    '12:00': '13:00',
    '13:00': '14:00',
    '14:00': '15:00',
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
    const start = startTime.slice(0, 5) as TimeRangeKey;
    const end = TIME_RANGE_MAP[start];
    return end ? `${start} - ${end}` : start;
  }

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('items, dispatch_date, dispatch_time, shipped, total_price, payment_intent_id, payment_status')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('注文データの取得に失敗しました');
        return;
      }

      setItems((data.items as OrderItem[]).filter((item) => item.quantity > 0));
      setDispatchDate(data.dispatch_date);
      setDispatchTime(data.dispatch_time);
      setOriginalTotal(data.total_price);
      setPaymentIntentId(data.payment_intent_id);

      // 編集可能かどうかを判定
      const today = new Date();
      const targetDate = new Date(data.dispatch_date);
      targetDate.setDate(targetDate.getDate() - 1); // 2日前まで

      setEditAllowed(!data.shipped && today <= targetDate && data.payment_status !== 'cancelled');

      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  // タイムスロットの取得
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        const res = await fetch('/api/get-available-slots');
        const { timeSlots } = await res.json();
        setTimeSlots(timeSlots);

        // 重複しない日付(ISO)を抽出
        const isoDates = Array.from(
          new Set(
            timeSlots
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
      } catch (err) {
        console.error('Error fetching time slots:', err);
      }
    };

    fetchTimeSlots();
  }, []);

  // 日付が決まったら時間リストを作る
  useEffect(() => {
    if (!dispatchDate) return;

    const times = timeSlots
      .filter(
        (s) => s.date === dispatchDate && s.is_available,
      )
      .map((s) => s.time);

    setAvailableTimes(times);
  }, [dispatchDate, timeSlots]);

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
      ).filter(item => item.quantity > 0)
    );
  };

  const remove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const newTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 10;
    try {
      // 1. 古いタイムスロットを解放
      const { data: oldSlot, error: oldSlotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', dispatchDate)
        .eq('time', dispatchTime)
        .single();

      if (oldSlotError) {
        console.error('古いタイムスロットの取得に失敗:', oldSlotError);
        throw new Error('古いタイムスロットの取得に失敗しました');
      }

      const { error: updateOldSlotError } = await supabase
        .from('time_slots')
        .update({ current_bookings: (oldSlot?.current_bookings || 0) - 1 })
        .eq('date', dispatchDate)
        .eq('time', dispatchTime);

      if (updateOldSlotError) {
        console.error('古いタイムスロットの解放に失敗:', updateOldSlotError);
        throw new Error('古いタイムスロットの解放に失敗しました');
      }

      // 2. 新しいタイムスロットを予約
      const { data: newSlot, error: newSlotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', dispatchDate)
        .eq('time', dispatchTime)
        .single();

      if (newSlotError) {
        console.error('新しいタイムスロットの取得に失敗:', newSlotError);
        throw new Error('新しいタイムスロットの取得に失敗しました');
      }

      const { error: updateNewSlotError } = await supabase
        .from('time_slots')
        .update({ current_bookings: (newSlot?.current_bookings || 0) + 1 })
        .eq('date', dispatchDate)
        .eq('time', dispatchTime);

      if (updateNewSlotError) {
        console.error('新しいタイムスロットの予約に失敗:', updateNewSlotError);
        throw new Error('新しいタイムスロットの予約に失敗しました');
      }

      // 3. 金額が変更された場合はStripeの注文をキャンセルし新規発行
      if (newTotal !== originalTotal) {
        // 3-1. 既存PaymentIntentをキャンセル
        if (paymentIntentId) {
          const cancelRes = await fetch('/api/cancel-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId }),
          });
          if (!cancelRes.ok) {
            const err = await cancelRes.json();
            throw new Error(err.error || '支払いのキャンセルに失敗しました');
          }
        }
        // 3-2. customerId取得
        const customerRes = await fetch('/api/create-or-get-customer', { method: 'POST' });
        const { customerId, error: customerError } = await customerRes.json();
        if (!customerId) throw new Error(customerError || 'カスタマー情報の取得に失敗しました');
        // 3-3. paymentMethodId取得（Zustandストアから or Stripeから取得）
        let paymentMethodId = useCartStore.getState().paymentMethodId;
        if (!paymentMethodId) {
          // StripeのAPIから取得
          const pmRes = await fetch('/api/get-payment-method', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId }),
          });
          const pmData = await pmRes.json();
          if (!pmRes.ok || !pmData.paymentMethodId) {
            throw new Error(pmData.error || '支払い方法の取得に失敗しました');
          }
          paymentMethodId = pmData.paymentMethodId;
        }
        // 3-4. 新しいPaymentIntent作成
        const createRes = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: newTotal,
            customerId,
            paymentMethodId,
          }),
        });
        const { paymentIntent, error: createError } = await createRes.json();
        if (!paymentIntent?.id) throw new Error(createError || '新しい支払いの作成に失敗しました');
        // 3-5. DB更新（新しいpayment_intent_idで）
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            items,
            dispatch_date: dispatchDate,
            dispatch_time: dispatchTime,
            total_price: newTotal,
            payment_intent_id: paymentIntent.id,
          })
          .eq('id', id);
        if (orderError) throw new Error('注文情報の更新に失敗しました');
      } else {
        // 金額が変わらない場合は従来通り
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            items,
            dispatch_date: dispatchDate,
            dispatch_time: dispatchTime,
            total_price: newTotal,
          })
          .eq('id', id);
        if (orderError) throw new Error('注文情報の更新に失敗しました');
      }
      router.push(`/account/orders/${id}`);
    } catch (error) {
      console.error('注文更新エラーの詳細:', error);
      alert(error instanceof Error ? error.message : '注文の更新に失敗しました');
    }
  };

  const cancelOrder = async () => {
    if (!confirm('本当に注文をキャンセルしますか？')) {
      return;
    }

    try {
      // 1. タイムスロットを解放
      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', dispatchDate)
        .eq('time', dispatchTime)
        .single();

      if (slotError) {
        throw new Error('タイムスロットの取得に失敗しました');
      }

      const { error: updateSlotError } = await supabase
        .from('time_slots')
        .update({ current_bookings: Math.max(0, (slot?.current_bookings || 0) - 1) })
        .eq('date', dispatchDate)
        .eq('time', dispatchTime);

      if (updateSlotError) {
        throw new Error('タイムスロットの解放に失敗しました');
      }

      // 2. Stripeの支払いをキャンセル
      if (paymentIntentId) {
        const response = await fetch('/api/cancel-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '支払いのキャンセルに失敗しました');
        }

        // すでにキャンセル済みの場合は警告を表示
        if (data.message) {
          console.warn(data.message);
        }
      }

      // 3. 注文をキャンセル状態に更新
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'cancelled',
          shipped: false
        })
        .eq('id', id);

      if (orderError) {
        throw new Error('注文のキャンセルに失敗しました');
      }

      router.push('/account/orders');
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert(error instanceof Error ? error.message : '注文のキャンセルに失敗しました');
    }
  };

  if (loading) return <div className="p-6 text-center">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!editAllowed) return (
    <div className="p-6 text-center text-gray-500">
      {paymentIntentId ? 'この注文は編集できません。' : 'この注文はキャンセルされています。'}
    </div>
  );

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 10;

  return (
    <>
      <main className="min-h-[calc(100vh-7rem)] pb-8 px-6 py-5 bg-white">
        <h1 className="text-xl mb-3">注文内容の編集</h1>

        {/* 受取日時 */}
        <div className="mb-8 space-y-2">
          <label className="block text-sm text-gray-700">受取日</label>
          <Select
            value={dispatchDate}
            onValueChange={(v) => setDispatchDate(v)}
          >
            <SelectTrigger className="w-full items-center border-2 border-gray-300 h-15 text-xl">
              <SelectValue placeholder="日付を選択してください">
                {dispatchDate ? formatDate(dispatchDate) : "お持ち帰り日時を選択してください"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableDates.map(({ iso, label }) => (
                <SelectItem key={iso} value={iso}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="block text-sm text-gray-700 mt-4">受取時間</label>
          <Select
            value={dispatchTime}
            onValueChange={(v) => setDispatchTime(v)}
          >
            <SelectTrigger className="w-full items-center border-2 border-gray-300 h-15 text-xl">
              <SelectValue placeholder="時間を選択してください">
                {dispatchTime ? formatTimeRange(dispatchTime) : "お持ち帰り日時を選択してください"}
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

            <div className="flex justify-between">
              <p>袋代</p>
              <p>¥10</p>
            </div>
            <div className="flex -mt-2 justify-between text-xl">
              <p>合計</p>
              <p>¥{total.toLocaleString()}</p>
            </div>

            <div className="hidden md:flex justify-end mt-8 space-x-4">
              <button
                onClick={() => router.push(`/account/orders/${id}`)}
                className="w-40 py-4 px-6 border border-[#887c5d] text-[#887c5d] bg-white hover:bg-[#f5f2ea] text-lg rounded"
              >
                戻る
              </button>
              <button
                onClick={cancelOrder}
                className="w-40 py-4 px-6 bg-red-200 text-red-700 text-lg rounded hover:bg-red-300 border border-red-300"
              >
                キャンセル
              </button>
              <button
                onClick={save}
                className="w-56 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg rounded hover:bg-gray-600"
              >
                保存 ¥{total.toLocaleString()}
              </button>
            </div>
          </div>
        ) : (
          <p>商品がありません。</p>
        )}
      <div className="w-full bg-white border-t border-gray-300 px-6 py-4 space-y-3 md:hidden">
            {/* キャンセル & 確定 */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-[#887c5d] text-[#887c5d] hover:bg-[#f5f2ea]"
                onClick={cancelOrder}
              >
                注文をキャンセル
              </Button>
              <Button
                className="flex-1 bg-[#887c5d] text-white hover:bg-[#6e634b]"
                onClick={save}
              >
                変更を確定
              </Button>
            </div>

            {/* 戻る */}
            <Button
              variant="outline"
              className="w-full border-[#887c5d] text-[#887c5d] hover:bg-[#f5f2ea] h-10"
              onClick={() => router.push(`/account/orders/${id}`)}
            >
              戻る
            </Button>
          </div>


      </main>
    </>
  );
}
