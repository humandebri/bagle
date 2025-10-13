'use client';

import { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  PencilIcon, 
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { DateTimeDisplay_order } from '@/components/DateTimeDisplay';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  user_id: string;
  dispatch_date: string;
  dispatch_time: string;
  dispatch_end_time?: string | null;
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
  payment_status?: string;
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
    let fetched: Order[] = [];
    try {
      const response = await fetch('/api/admin/reservations');
      if (!response.ok) {
        throw new Error('予約データの取得に失敗しました');
      }
      const data = await response.json();

      fetched = Array.isArray(data) ? data : [];
      setOrders(fetched);
    } catch (error) {
      console.error('予約データの取得に失敗しました:', error);
      fetched = [];
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
    return fetched;
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
        .select('current_bookings, end_time')
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
      const nextDispatchEndTime = newSlot?.end_time
        ? typeof newSlot.end_time === 'string'
          ? newSlot.end_time.slice(0, 5)
          : new Date(newSlot.end_time).toISOString().slice(11, 16)
        : null;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          dispatch_date: selectedNewDate,
          dispatch_time: selectedNewTime,
          dispatch_end_time: nextDispatchEndTime,
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

  const unshippedOrdersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return orders.filter(order => {
      const orderDate = order.dispatch_date.split('T')[0];
      return (
        orderDate === selectedDate &&
        !order.shipped &&
        order.payment_status !== 'cancelled'
      );
    });
  }, [orders, selectedDate]);

  const handleBulkCompleteByDate = async () => {
    if (!selectedDate) return;
    const targets = unshippedOrdersForSelectedDate;
    if (targets.length === 0) {
      alert('未受取の予約はありません');
      return;
    }

    const formattedDate = format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: ja });
    const confirmMessage = `${formattedDate} の未受取予約 ${targets.length}件を受取済に更新しますか？`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/reservations/mark-shipped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          (errorBody && typeof errorBody.error === 'string' && errorBody.error) ||
          '一括更新に失敗しました';
        throw new Error(message);
      }

      const result = await response.json().catch(() => ({}));
      const updatedOrders = await fetchOrders();

      setSelectedOrder(prev => {
        if (!selectedDate) return null;
        const ordersForDate = updatedOrders.filter(order => order.dispatch_date.split('T')[0] === selectedDate);
        const sortedForDate = [...ordersForDate].sort((a, b) => a.dispatch_time.localeCompare(b.dispatch_time));
        if (!prev) {
          return sortedForDate[0] ?? null;
        }
        const updated = updatedOrders.find(order => order.id === prev.id);
        return updated ?? (sortedForDate[0] ?? null);
      });

      const updatedCount = typeof result.updatedCount === 'number' ? result.updatedCount : targets.length;
      if (updatedCount === 0) {
        alert('対象の未受取予約はありませんでした');
      } else {
        alert(`${formattedDate} の未受取予約 ${updatedCount}件を受取済に更新しました`);
      }
    } catch (error) {
      console.error('一括受取エラー:', error);
      alert(error instanceof Error ? error.message : '一括更新に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ステータスに応じた色を返す
  const getStatusColor = (order: Order) => {
    if (order.payment_status === 'cancelled') {
      return '#EF4444'; // 赤色（キャンセル）
    }
    if (order.shipped) {
      return '#60A5FA'; // 青色（完了）
    }
    return '#FCD34D'; // 黄色（未完了）
  };


  // 受取ステータスの日本語表示
const getShippedStatusLabel = (order: Order) => {
  if (order.payment_status === 'cancelled') {
    return 'キャンセル済';
  }
  const shipped = order.shipped === true;
  return shipped ? '受取済' : '未受取';
};

const formatOrderTimeRange = (order: Order) => {
  const start = order.dispatch_time?.slice(0, 5) ?? '';
  const end = order.dispatch_end_time?.slice(0, 5);
  if (end && end !== start) {
    return `${start}〜${end}`;
  }
  return start;
};
  

  // カレンダーに表示するイベントデータを作成
  const events = orders
    .filter(order => {
      if (!filterStatus) return true;
      if (filterStatus === 'shipped') return order.shipped;
      if (filterStatus === 'unshipped') return !order.shipped && order.payment_status !== 'cancelled';
      if (filterStatus === 'cancelled') return order.payment_status === 'cancelled';
      return true;
    })
    .map(order => {
      // 日付を正規化（YYYY-MM-DD形式に）
      const normalizedDate = order.dispatch_date.split('T')[0];
      const startTime = order.dispatch_time
        ? order.dispatch_time.slice(0, 5)
        : '';
      const formattedTime = startTime || formatOrderTimeRange(order);
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      // 苗字を抽出（スペースがある場合は最初の部分、なければ全体）
      const lastName = order.customer_name ? order.customer_name.split(/[\s　]/)[0] : '未設定';
      
      const customerLabel = order.customer_name ? `${lastName}様` : '未設定';

      return {
        title: `${formattedTime} ${customerLabel} ${totalItems}個`,
        date: normalizedDate,
        extendedProps: { 
          order,
          time: formattedTime,
          totalItems,
          customerName: order.customer_name || '未設定',
          customerLastName: lastName
        },
        backgroundColor: getStatusColor(order),
        textColor: order.payment_status === 'cancelled' ? '#ffffff' : '#000000',
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
      // キャンセル対象の注文を取得
      const targetOrder = orders.find(o => o.id === orderId);
      if (!targetOrder) {
        throw new Error('注文が見つかりません');
      }

      // 1. タイムスロットを解放
      // time_slotsテーブルの時間形式に合わせる（HH:MM:SS形式）
      const timeWithSeconds = targetOrder.dispatch_time.length === 5 
        ? `${targetOrder.dispatch_time}:00` 
        : targetOrder.dispatch_time;
      
      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('current_bookings')
        .eq('date', targetOrder.dispatch_date)
        .eq('time', timeWithSeconds)
        .single();

      if (slotError) {
        console.error('タイムスロット取得エラー:', slotError);
        console.error('検索条件:', { date: targetOrder.dispatch_date, time: timeWithSeconds });
        // エラーでもキャンセル処理は続行
      } else if (slot) {
        await supabase
          .from('time_slots')
          .update({ current_bookings: Math.max(0, (slot.current_bookings || 0) - 1) })
          .eq('date', targetOrder.dispatch_date)
          .eq('time', timeWithSeconds);
      }

      // 2. 注文をキャンセル状態に更新
      const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'cancelled' })
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
    return <div className="p-4 sm:p-8 text-center">ロード中...</div>;
  }

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">予約管理</h1>
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FCD34D' }}></div>
              <span className="text-sm">未受取</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#60A5FA' }}></div>
              <span className="text-sm">受取済</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-sm">キャンセル</span>
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">すべての注文</option>
            <option value="unshipped">未受取</option>
            <option value="shipped">受取済</option>
            <option value="cancelled">キャンセル済</option>
          </select>
          <button
            // onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg shadow-sm text-gray-400 bg-gray-100 cursor-not-allowed"
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
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-sm">
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
                <div className={`font-semibold ${eventInfo.event.extendedProps.order.payment_status === 'cancelled' ? 'line-through' : ''}`}>
                  {eventInfo.event.extendedProps.time}
                  <span className="mx-1" />
                  {eventInfo.event.extendedProps.totalItems}個
                  <span className="mx-1" />
                  {eventInfo.event.extendedProps.customerLastName}様
                </div>
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
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: ja }) : '日付を選択'}
            </h2>
            <div className="flex gap-2">
              {selectedDate && (
                <button
                  onClick={handleBulkCompleteByDate}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  disabled={unshippedOrdersForSelectedDate.length === 0 || isProcessing}
                  title={
                    unshippedOrdersForSelectedDate.length === 0
                      ? '未受取の予約がありません'
                      : '選択した日付の未受取予約を一括で受取済に更新します'
                  }
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>
                    一括受取
                    {unshippedOrdersForSelectedDate.length > 0 && ` (${unshippedOrdersForSelectedDate.length})`}
                  </span>
                </button>
              )}
              {selectedDate && (
                <button
                  onClick={() => window.open(`/print/reservations?date=${selectedDate}`, '_blank')}
                  className="p-2 text-blue-600 hover:text-blue-700"
                  title="印刷用ページを開く"
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
              )}
            {selectedOrder && (
              <>
                {!selectedOrder.shipped && selectedOrder.payment_status !== 'cancelled' && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="p-2 text-green-600 hover:text-green-700"
                    title="商品受け渡し完了"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleTimeEdit}
                  className={`p-2 ${
                    selectedOrder.shipped || selectedOrder.payment_status === 'cancelled'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={
                    selectedOrder.payment_status === 'cancelled'
                      ? 'キャンセル済みの注文は編集できません'
                      : selectedOrder.shipped
                      ? '受取済みの注文は編集できません'
                      : '受け取り時間の変更'
                  }
                  disabled={selectedOrder.shipped || selectedOrder.payment_status === 'cancelled'}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className={`p-2 ${
                    selectedOrder.shipped || selectedOrder.payment_status === 'cancelled'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-red-600'
                  }`}
                  title={
                    selectedOrder.payment_status === 'cancelled'
                      ? '既にキャンセル済みです'
                      : selectedOrder.shipped
                      ? '受取済みの注文はキャンセルできません'
                      : '予約のキャンセル'
                  }
                  disabled={selectedOrder.shipped || selectedOrder.payment_status === 'cancelled'}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </>
            )}
            </div>
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
                        {formatOrderTimeRange(order)} {order.customer_name || '未設定'}様
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{order.items.reduce((sum, item) => sum + item.quantity, 0)}個</span>
                        <div className="flex gap-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: order.payment_status === 'cancelled' ? '#EF444420' : order.shipped ? '#60A5FA20' : '#FCD34D20',
                              color: order.payment_status === 'cancelled' ? '#EF4444' : order.shipped ? '#60A5FA' : '#FCD34D',
                            }}
                          >
                            {getShippedStatusLabel(order)}
                          </span>
                        </div>
                      </div>
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
                    <span className="text-gray-600">受取ステータス</span>
                    <span className="font-medium" style={{ 
                      color: selectedOrder.payment_status === 'cancelled' ? '#EF4444' : selectedOrder.shipped ? '#60A5FA' : '#FCD34D'
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
                        endTime={selectedOrder.dispatch_end_time ?? undefined}
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white p-3 sm:p-6 rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">商品受け渡し完了の確認</h3>
            <p className="mb-4">
              以下の注文の商品受け渡しを完了としてよろしいですか？
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => setShowTimeEditModal(false)}
        >
          <div 
            className="bg-white p-3 sm:p-6 rounded-lg max-w-md w-full"
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
