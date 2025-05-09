'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  PencilIcon, 
  TrashIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { DateTimeDisplay_order } from '@/components/DateTimeDisplay';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  user_id: string;
  dispatch_date: string;
  dispatch_time: string;
  payment_status: string;
  shipped: boolean;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  total_price: number;
  customer_name: string | null;
  phone: string | null;
  created_at: string;
  payment_intent_id: string;
  captured_at: string | null;
};

type DateClickArg = {
  dateStr: string;
  date: Date;
  allDay: boolean;
  view: {
    type: string;
    title: string;
  };
};

type TimeSlot = {
  date: string;
  time: string;
  is_available: boolean;
};

export default function ReservationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTimeEditModal, setShowTimeEditModal] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedNewDate, setSelectedNewDate] = useState('');
  const [selectedNewTime, setSelectedNewTime] = useState('');
  
  // 予約データの取得
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/reservations');
      if (!response.ok) {
        throw new Error('予約データの取得に失敗しました');
      }
      const data = await response.json();

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('予約データの取得に失敗しました:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 利用可能な時間枠を取得
  const fetchAvailableTimeSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('is_available', true)
        .order('date')
        .order('time');

      if (error) throw error;
      setAvailableTimeSlots(data || []);
    } catch (error) {
      console.error('時間枠の取得に失敗:', error);
    }
  };

  // 日付が選択されたときに利用可能な時間を更新
  useEffect(() => {
    if (selectedNewDate) {
      const times = availableTimeSlots
        .filter(slot => slot.date === selectedNewDate)
        .map(slot => slot.time);
      setSelectedNewTime(times[0] || '');
    }
  }, [selectedNewDate, availableTimeSlots]);

  // 時間変更の処理
  const handleTimeUpdate = async () => {
    if (!selectedOrder || !selectedNewDate || !selectedNewTime) return;

    setIsProcessing(true);
    try {
      // 1. 古いタイムスロットを解放
      const { data: oldSlot, error: oldSlotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', selectedOrder.dispatch_date)
        .eq('time', selectedOrder.dispatch_time)
        .single();

      if (oldSlotError) throw oldSlotError;

      await supabase
        .from('time_slots')
        .update({ current_bookings: (oldSlot?.current_bookings || 0) - 1 })
        .eq('date', selectedOrder.dispatch_date)
        .eq('time', selectedOrder.dispatch_time);

      // 2. 新しいタイムスロットを予約
      const { data: newSlot, error: newSlotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', selectedNewDate)
        .eq('time', selectedNewTime)
        .single();

      if (newSlotError) throw newSlotError;

      await supabase
        .from('time_slots')
        .update({ current_bookings: (newSlot?.current_bookings || 0) + 1 })
        .eq('date', selectedNewDate)
        .eq('time', selectedNewTime);

      // 3. 注文情報を更新
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          dispatch_date: selectedNewDate,
          dispatch_time: selectedNewTime,
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      await fetchOrders();
      setShowTimeEditModal(false);
    } catch (error) {
      console.error('時間変更エラー:', error);
      alert('時間の変更に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // 時間編集モーダルを開く
  const handleTimeEdit = async () => {
    if (!selectedOrder) return;
    await fetchAvailableTimeSlots();
    setSelectedNewDate(selectedOrder.dispatch_date);
    setSelectedNewTime(selectedOrder.dispatch_time);
    setShowTimeEditModal(true);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ステータスに応じた色を返す
  const getStatusColor = (order: Order) => {
    if (order.payment_status === 'cancelled') {
      return '#F87171'; // 赤色（キャンセル）
    }
    if (order.shipped && order.payment_status === 'confirmed') {
      return '#60A5FA'; // 青色（完了）
    }
    if (order.payment_status === 'confirmed') {
      return '#34D399'; // 緑色（確認済み）
    }
    if (order.payment_status === 'pending') {
      return '#FCD34D'; // 黄色（保留中）
    }
    return '#9CA3AF'; // グレー（その他）
  };

  // 支払いステータスの日本語表示
  const getPaymentStatusLabel = (order: Order) => {
    if (order.payment_status === 'cancelled') {
      return 'cancelled';
    } else if (order.payment_status === 'confirmed') {
      return 'confirmed';
    } else if (order.payment_status === 'pending') {
      return 'pending';
    }
    return order.payment_status;
  };

  // 受取ステータスの日本語表示
  const getShippedStatusLabel = (order: Order) => {
    const shipped = order.shipped === true;
    return shipped ? '受取済' : '未受取';
  };
  

  // カレンダーに表示するイベントデータを作成
  const events = orders
    .filter(order => !filterStatus || getPaymentStatusLabel(order) === filterStatus)
    .filter(order => order.payment_status !== 'cancelled') // キャンセル済みを除外
    .map(order => {
      // 日付を正規化（YYYY-MM-DD形式に）
      const normalizedDate = order.dispatch_date.split('T')[0];
      const formattedTime = order.dispatch_time.split(':').slice(0, 2).join(':');
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        title: `${formattedTime} - ${totalItems}個`,
        date: normalizedDate,
        extendedProps: { 
          order,
          time: formattedTime,
          totalItems,
          customerName: order.customer_name || '未設定'
        },
        backgroundColor: getStatusColor(order),
      };
    });
  
  // 日付をクリックしたときの処理
  const handleDateClick = (arg: DateClickArg) => {
    const date = arg.dateStr;
    setSelectedDate(date);
    // 同じ日付のオーダーを全て取得
    const ordersForDate = orders.filter(o => o.dispatch_date.split('T')[0] === date);
    setSelectedOrder(ordersForDate[0] || null);
  };

  // 予約のキャンセル
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('この予約をキャンセルしてもよろしいですか？')) return;

    setIsProcessing(true);
    try {
      // 1. タイムスロットを解放
      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', selectedOrder?.dispatch_date)
        .eq('time', selectedOrder?.dispatch_time)
        .single();

      if (slotError) {
        throw new Error('タイムスロットの取得に失敗しました');
      }

      await supabase
        .from('time_slots')
        .update({ current_bookings: Math.max(0, (slot?.current_bookings || 0) - 1) })
        .eq('date', selectedOrder?.dispatch_date)
        .eq('time', selectedOrder?.dispatch_time);

      // 2. 注文をキャンセル状態に更新
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'cancelled',
          shipped: false
        })
        .eq('id', orderId);

      if (orderError) {
        throw new Error('注文のキャンセルに失敗しました');
      }

      await fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert(error instanceof Error ? error.message : '注文のキャンセルに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // 商品ごとの合計数を計算
  const calculateTotals = (items: Order['items']) => {
    return items.reduce((acc: Record<string, number>, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
      return acc;
    }, {});
  };

  // 商品受け渡し完了処理
  const handleCompleteOrder = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/complete-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        throw new Error('処理に失敗しました');
      }

      await fetchOrders();
      setShowConfirmModal(false);
    } catch (error) {
      console.error('エラー:', error);
      alert('処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FCD34D' }}></div>
              <span className="text-sm">保留中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34D399' }}></div>
              <span className="text-sm">確認済み</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#60A5FA' }}></div>
              <span className="text-sm">完了</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F87171' }}></div>
              <span className="text-sm">キャンセル</span>
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">すべてのステータス</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="shipped">shipped</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button
            // onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-400 bg-gray-100 cursor-not-allowed"
            disabled={true}
            title="現在、新規予約の作成はできません"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新規予約
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カレンダー */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ja"
            events={events}
            dateClick={handleDateClick}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek',
            }}
            height="auto"
            eventContent={(eventInfo) => (
              <div className="p-1 text-xs">
                <div className="font-semibold">
                  {eventInfo.event.extendedProps.time}
                  <span className="mx-1" />
                  {eventInfo.event.extendedProps.totalItems}個
                </div>
                <div></div>
              </div>
            )}
          />
          {/* 注文数の合計表示 */}
          {selectedDate && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: ja })}の注文合計
              </h3>
              <div className="space-y-2">
                {Object.entries(calculateTotals(orders
                  .filter(order => 
                    order.dispatch_date.split('T')[0] === selectedDate && 
                    order.payment_status !== 'cancelled'
                  )
                  .flatMap(order => order.items)))
                  .map(([name, quantity]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="text-gray-700">{name}</span>
                      <span className="font-medium">{quantity}個</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 予約詳細 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: ja }) : '日付を選択'}
            </h2>
            {selectedOrder && (
              <div className="flex gap-2">
                {!selectedOrder.shipped && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className={`p-2 ${
                      selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-green-600 hover:text-green-700'
                    }`}
                    title={
                      selectedOrder.payment_status === 'cancelled'
                        ? 'キャンセルされた注文は完了できません'
                        : selectedOrder.payment_status === 'confirmed'
                        ? '確認済みの注文は完了できません'
                        : '商品受け渡し完了'
                    }
                    disabled={selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'}
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleTimeEdit}
                  className={`p-2 ${
                    selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={
                    selectedOrder.payment_status === 'cancelled'
                      ? 'キャンセルされた注文は編集できません'
                      : selectedOrder.payment_status === 'confirmed'
                      ? '確認済みの注文は編集できません'
                      : '受け取り時間の変更'
                  }
                  disabled={selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className={`p-2 ${
                    selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-red-600'
                  }`}
                  title={
                    selectedOrder.payment_status === 'cancelled'
                      ? 'キャンセル済みの注文です'
                      : selectedOrder.payment_status === 'confirmed'
                      ? '確認済みの注文はキャンセルできません'
                      : '予約のキャンセル'
                  }
                  disabled={selectedOrder.payment_status === 'cancelled' || selectedOrder.payment_status === 'confirmed'}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {selectedDate && (
            <div className="space-y-4">
              {orders
                .filter(order => order.dispatch_date.split('T')[0] === selectedDate)
                .sort((a, b) => a.dispatch_time.localeCompare(b.dispatch_time))
                .map(order => (
                  <div 
                    key={order.id}
                    className={`p-4 rounded-lg border ${
                      selectedOrder?.id === order.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium text-sm text-gray-800">
                        {order.dispatch_time.split(':').slice(0, 2).join(':')} {order.customer_name || '未設定'}様
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{order.items.reduce((sum, item) => sum + item.quantity, 0)}個</span>
                        <div className="flex gap-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: getStatusColor(order) + '20',
                              color: getStatusColor(order),
                            }}
                          >
                            {getPaymentStatusLabel(order)}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: order.shipped ? '#60A5FA20' : '#FCD34D20',
                              color: order.shipped ? '#60A5FA' : '#FCD34D',
                            }}
                          >
                            {getShippedStatusLabel(order)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      {order.items.map(item => `${item.name}(${item.quantity}個)`).join(', ')}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {selectedOrder && (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">予約情報</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">支払いステータス</span>
                    <span className="font-medium" style={{ color: getStatusColor(selectedOrder) }}>
                      {getPaymentStatusLabel(selectedOrder)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">受取ステータス</span>
                    <span className="font-medium" style={{ 
                      color: selectedOrder.shipped ? '#60A5FA' : '#FCD34D'
                    }}>
                      {getShippedStatusLabel(selectedOrder)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">受け取り日時</span>
                    <span>
                      <DateTimeDisplay_order 
                        date={selectedOrder.dispatch_date} 
                        time={selectedOrder.dispatch_time} 
                      />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">注文日時</span>
                    <span>{format(new Date(selectedOrder.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">合計金額</span>
                    <span>¥{selectedOrder.total_price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">顧客情報</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">お名前</span>
                    <span>{selectedOrder.customer_name || '未設定'}様</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">電話番号</span>
                    <span>{selectedOrder.phone || '未設定'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">注文内容</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{item.quantity}個 (¥{item.price.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirmModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">商品受け渡し完了の確認</h3>
            <p className="mb-4">
              以下の注文の商品受け渡しを完了としてよろしいですか？
              {selectedOrder.payment_status === 'pending' && (
                <span className="block text-red-600 mt-2">
                  ※ この注文は未決済です。完了処理を行うと決済が実行されます。
                </span>
              )}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isProcessing}
              >
                キャンセル
              </button>
              <button
                onClick={() => handleCompleteOrder(selectedOrder.id)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? '処理中...' : '完了として登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 時間編集モーダル */}
      {showTimeEditModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-[9999]"
          onClick={() => setShowTimeEditModal(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">受け取り時間の変更</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">日付</label>
                <select
                  value={selectedNewDate}
                  onChange={(e) => setSelectedNewDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {Array.from(new Set(availableTimeSlots.map(slot => slot.date)))
                    .sort()
                    .map(date => (
                      <option key={date} value={date}>
                        {format(new Date(date), 'yyyy年MM月dd日', { locale: ja })}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">時間</label>
                <select
                  value={selectedNewTime}
                  onChange={(e) => setSelectedNewTime(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {availableTimeSlots
                    .filter(slot => slot.date === selectedNewDate)
                    .map(slot => (
                      <option key={slot.time} value={slot.time}>
                        {slot.time.split(':').slice(0, 2).join(':')}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowTimeEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isProcessing}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleTimeUpdate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? '処理中...' : '変更を保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 