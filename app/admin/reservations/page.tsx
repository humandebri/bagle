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
  MagnifyingGlassIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { DateTimeDisplay_order } from '@/components/DateTimeDisplay';

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

export default function ReservationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  // ステータスの日本語表示
  const getStatusLabel = (order: Order) => {
    if (order.payment_status === 'cancelled') {
      return 'cancelled';
    }
    if (order.shipped && order.payment_status === 'confirmed') {
      return 'shipped';
    }
    if (order.payment_status === 'confirmed') {
      return 'confirmed';
    }
    if (order.payment_status === 'pending') {
      return 'pending';
    }
    return order.payment_status;
  };

  // カレンダーに表示するイベントデータを作成
  const events = orders
    .filter(order => !filterStatus || getStatusLabel(order) === filterStatus)
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
    setIsEditing(false);
  };

  // 予約の更新
  const handleUpdateOrder = async (orderId: string, data: Partial<Order>) => {
    try {
      const response = await fetch('/api/admin/reservations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: orderId, ...data }),
      });

      if (!response.ok) throw new Error('予約の更新に失敗しました');

      await fetchOrders();
      setIsEditing(false);
    } catch (error) {
      console.error('予約の更新に失敗しました:', error);
    }
  };

  // 予約の削除
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('この予約を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/admin/reservations?id=${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('予約の削除に失敗しました');

      await fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('予約の削除に失敗しました:', error);
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
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
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
                    className="p-2 text-green-600 hover:text-green-700"
                    title="商品受け渡し完了"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="p-2 text-gray-600 hover:text-red-600"
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
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{order.dispatch_time.split(':').slice(0, 2).join(':')}</div>
                        <div className="text-sm text-gray-600">{order.customer_name || '未設定'}様</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}個
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full" style={{ 
                          backgroundColor: getStatusColor(order) + '20',
                          color: getStatusColor(order)
                        }}>
                          {getStatusLabel(order)}
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
                    <span className="text-gray-600">ステータス</span>
                    <span className="font-medium" style={{ color: getStatusColor(selectedOrder) }}>
                      {getStatusLabel(selectedOrder)}
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
    </div>
  );
} 