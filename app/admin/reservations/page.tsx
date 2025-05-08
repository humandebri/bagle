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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

type Order = {
  id: string;
  user_id: string;
  dispatch_date: string;
  dispatch_time: string;
  status: string;
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

export default function ReservationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FCD34D'; // 黄色
      case 'confirmed':
        return '#34D399'; // 緑色
      case 'completed':
        return '#60A5FA'; // 青色
      case 'cancelled':
        return '#F87171'; // 赤色
      default:
        return '#9CA3AF'; // グレー
    }
  };

  // カレンダーに表示するイベントデータを作成
  const events = orders
    .filter(order => !filterStatus || order.status === filterStatus)
    .filter(order => order.status !== 'cancelled') // キャンセル済みを除外
    .map(order => {
      // 日付を正規化（YYYY-MM-DD形式に）
      const normalizedDate = order.dispatch_date.split('T')[0];
      const time = order.dispatch_time.split(':').slice(0, 2).join(':');
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        title: `${time} - ${totalItems}個`,
        date: normalizedDate,
        extendedProps: { 
          order,
          time,
          totalItems,
          customerName: order.customer_name || '未設定'
        },
        backgroundColor: getStatusColor(order.status),
      };
    });

  // 日付をクリックしたときの処理
  const handleDateClick = (arg: any) => {
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

  if (isLoading) {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">すべてのステータス</option>
            <option value="pending">保留中</option>
            <option value="confirmed">確認済み</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
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
                <div className="font-semibold">{eventInfo.event.extendedProps.time}</div>
                <div>{eventInfo.event.extendedProps.totalItems}個</div>
                <div className="truncate">{eventInfo.event.extendedProps.customerName}</div>
              </div>
            )}
          />
        </div>

        {/* 予約詳細 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate ? format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: ja }) : '日付を選択'}
            </h2>
            {selectedOrder && (
              <div className="flex gap-2">
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
                        <div className="font-medium">{order.dispatch_time}</div>
                        <div className="text-sm text-gray-600">{order.customer_name || '未設定'}</div>
                      </div>
                      <div className="text-sm">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}個
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
                    <span className="text-gray-600">受け取り日時</span>
                    <span>{format(new Date(selectedOrder.dispatch_date), 'yyyy年MM月dd日', { locale: ja })} {selectedOrder.dispatch_time}</span>
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
                    <span>{selectedOrder.customer_name || '未設定'}</span>
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
    </div>
  );
} 