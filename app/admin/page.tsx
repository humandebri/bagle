'use client';

import { useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MAX_BAGEL_PER_ORDER, MAX_BAGEL_PER_ITEM, MAX_BAGEL_PER_ITEM_FILLING } from '@/lib/constants';

// KPIデータ型
interface KpiData {
  totalSales: number;
  orderCount: number;
  newCustomers: number;
  repeatCustomers: number;
  aov: number;
}

// 注文データ型
interface Order {
  id: string;
  user_id: string;
  created_at: string;
  items: OrderItem[];
  dispatch_date: string;
  dispatch_time: string;
  total_price: number;
  shipped: boolean;
  customer_name?: string;
  phone?: string;
  payment_status?: string;
}

// OrderItem型を定義
type OrderItem = unknown;


const ORDER_STATUS_OPTIONS = [
  { label: 'すべて', value: '' },
  { label: '未発送', value: 'pending' },
  { label: '発送済み', value: 'confirmed' },
  { label: 'キャンセル', value: 'canceled' },
];

function formatYen(num: number) {
  return num.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

export default function AdminDashboard() {
  // KPIデータ状態
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 期間指定
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // 注文状況
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [page, setPage] = useState(0); // ページ番号（0始まり）
  const PAGE_SIZE = 10;

  // 売上グラフ
  const [salesStats, setSalesStats] = useState<unknown[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'monthly'>('daily');
  const [salesFrom, setSalesFrom] = useState<string>('');
  const [salesTo, setSalesTo] = useState<string>('');

  // 商品数・カテゴリー数・注文数・時間枠数をAPIから取得
  const [availableProductCount, setAvailableProductCount] = useState<number>(0);
  const [unavailableProductCount, setUnavailableProductCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [timeSlotCount, setTimeSlotCount] = useState<number>(0);

  const fetchCounts = useCallback(async (from: string, to: string) => {
    // 商品数（すべての商品を取得して販売中・停止中を分けてカウント）
    const productsRes = await fetch('/api/products?all=true');
    const productsData = await productsRes.json();
    // APIが直接配列を返す場合と、productsプロパティを持つ場合の両方に対応
    const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
    
    const availableProducts = products.filter((p: { is_available: boolean }) => p.is_available === true);
    const unavailableProducts = products.filter((p: { is_available: boolean }) => p.is_available === false);
    
    setAvailableProductCount(availableProducts.length);
    setUnavailableProductCount(unavailableProducts.length);
    
    // カテゴリー数（categoriesテーブルから直接取得）
    const categoriesRes = await fetch('/api/categories');
    const categories = await categoriesRes.json();
    setCategoryCount(Array.isArray(categories) ? categories.length : 0);
    
    // 注文数（期間内）
    const summaryRes = await fetch(`/api/admin/summary?from=${from}&to=${to}`);
    const summary = await summaryRes.json();
    setOrderCount(summary.orderCount ?? 0);
    
    // 時間枠数（今日以降の予約可能枠のみ）
    const today = new Date().toISOString().split('T')[0];
    const timeSlotsRes = await fetch('/api/time_slots');
    const timeSlotsJson = await timeSlotsRes.json();
    const futureSlots = Array.isArray(timeSlotsJson.timeSlots)
      ? timeSlotsJson.timeSlots.filter((slot: { date: string; is_available: boolean }) => slot.date >= today && slot.is_available)
      : [];
    setTimeSlotCount(futureSlots.length);
  }, []);

  // 期間指定フォームの値が変わったら再取得
  useEffect(() => {
    if (from && to) fetchCounts(from, to);
  }, [fetchCounts, from, to]);

  // 初期値を過去30日間に設定
  useEffect(() => {
    if (!from && !to) {
      const today = new Date();
      const prior = new Date();
      prior.setDate(today.getDate() - 29);
      setFrom(prior.toISOString().slice(0, 10));
      setTo(today.toISOString().slice(0, 10));
    }
    if (!salesFrom && !salesTo) {
      const today = new Date();
      const prior = new Date();
      prior.setDate(today.getDate() - 29);
      setSalesFrom(prior.toISOString().slice(0, 10));
      setSalesTo(today.toISOString().slice(0, 10));
    }
  }, [from, to, salesFrom, salesTo]);

  useEffect(() => {
    const fetchKpi = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        const res = await fetch(`/api/admin/summary?${params.toString()}`);
        if (!res.ok) throw new Error('KPI取得に失敗しました');
        const data = await res.json();
        setKpi(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'KPI取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchKpi();
  }, [from, to]);

  useEffect(() => {
    const fetchOrders = async () => {
      setOrderLoading(true);
      setOrderError(null);
      try {
        const params = new URLSearchParams();
        if (orderStatus) params.append('status', orderStatus);
        params.append('limit', PAGE_SIZE.toString());
        params.append('offset', (page * PAGE_SIZE).toString());
        params.append('order', 'desc'); // 降順
        const res = await fetch(`/api/admin/reservations?${params.toString()}`);
        if (!res.ok) throw new Error('注文一覧の取得に失敗しました');
        const data = await res.json();
        // 0件になった場合は1つ前のページに戻す
        if (page > 0 && data.length === 0) {
          setPage(p => Math.max(0, p - 1));
        } else {
          setOrders(data);
        }
      } catch (e: unknown) {
        setOrderError(e instanceof Error ? e.message : '注文一覧の取得に失敗しました');
      } finally {
        setOrderLoading(false);
      }
    };
    fetchOrders();
  }, [orderStatus, page]);

  useEffect(() => {
    const fetchSales = async () => {
      setSalesLoading(true);
      setSalesError(null);
      try {
        const params = new URLSearchParams();
        params.append('period', salesPeriod);
        if (salesFrom) params.append('from', salesFrom);
        if (salesTo) params.append('to', salesTo);
        const res = await fetch(`/api/admin/sales-stats?${params.toString()}`);
        if (!res.ok) throw new Error('売上グラフの取得に失敗しました');
        const data = await res.json();
        setSalesStats(data);
      } catch (e: unknown) {
        setSalesError(e instanceof Error ? e.message : '売上グラフの取得に失敗しました');
      } finally {
        setSalesLoading(false);
      }
    };
    if (salesFrom && salesTo) fetchSales();
  }, [salesPeriod, salesFrom, salesTo]);



  return (
    <div className="px-2 py-3 sm:px-4 sm:py-4">
      {/* モバイル用タイトル */}
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:hidden">ダッシュボード</h1>
      
      {/* 期間指定フォーム */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-end">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">開始日</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full border border-[#887c5d]/30 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20" />
          </div>
          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">終了日</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full border border-[#887c5d]/30 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 text-gray-700 text-xs sm:text-base font-medium">
          <div className="bg-white p-2 sm:p-0 rounded-lg border sm:border-0">
            <span className="text-gray-600">商品</span>
            <span className="font-bold text-green-700 ml-1" title="販売中">{availableProductCount}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="font-bold text-gray-500" title="停止中">{unavailableProductCount}</span>
          </div>
          <div className="bg-white p-2 sm:p-0 rounded-lg border sm:border-0">
            <span className="text-gray-600">カテゴリー</span>
            <span className="font-bold text-gray-900 ml-1">{categoryCount}</span>
          </div>
          <div className="bg-white p-2 sm:p-0 rounded-lg border sm:border-0" title="選択期間内の注文数">
            <span className="text-gray-600">注文</span>
            <span className="font-bold text-gray-900 ml-1">{orderCount}</span>
          </div>
          <div className="bg-white p-2 sm:p-0 rounded-lg border sm:border-0" title="今日以降の予約可能枠">
            <span className="text-gray-600">時間枠</span>
            <span className="font-bold text-gray-900 ml-1">{timeSlotCount}</span>
          </div>
        </div>
      </div>

      {/* ダッシュボード上部：購入制限とKPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {/* 購入制限設定 */}
        <div className="bg-white p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 border-b pb-1 sm:pb-2">購入制限設定</h3>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">1注文あたり</span>
              <span className="font-bold text-gray-900">{MAX_BAGEL_PER_ORDER}個</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">通常ベーグル</span>
              <span className="font-bold text-gray-900">{MAX_BAGEL_PER_ITEM}個/商品</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">フィリング</span>
              <span className="font-bold text-gray-900">{MAX_BAGEL_PER_ITEM_FILLING}個/商品</span>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="lg:col-span-2 bg-white p-2 sm:p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 border-b pb-1 sm:pb-2">概要（KPI）</h3>
          {loading ? (
            <p className="text-gray-500 text-xs sm:text-sm">読み込み中...</p>
          ) : error ? (
            <p className="text-red-500 text-xs sm:text-sm">{error}</p>
          ) : kpi ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">売上合計</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900">{formatYen(kpi.totalSales)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">注文数</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900">{kpi.orderCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">新規/リピート</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900">
                  <span className="text-blue-600">{kpi.newCustomers}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-green-600">{kpi.repeatCustomers}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">平均注文額</p>
                <p className="text-sm sm:text-lg font-bold text-gray-900">{formatYen(kpi.aov)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 注文状況セクション */}
      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">注文状況</h2>
          <div className="flex items-center">
            <label className="mr-2 text-xs sm:text-sm text-gray-600">ステータス:</label>
            <select
              value={orderStatus}
              onChange={e => { setOrderStatus(e.target.value); setPage(0); }}
              className="border border-[#887c5d]/30 rounded-lg px-2 py-1 text-xs sm:text-sm bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20"
            >
              {ORDER_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        {orderLoading ? (
          <p>読み込み中...</p>
        ) : orderError ? (
          <p className="text-red-500">{orderError}</p>
        ) : (
          <>
            {/* モバイル用カード表示 */}
            <div className="sm:hidden space-y-2">
              {orders.length === 0 ? (
                <p className="text-center py-4 text-gray-500 text-sm">注文がありません</p>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-gray-500">ID: {order.id.slice(0, 8)}...</div>
                        <div className="font-medium text-sm">{order.customer_name || '顧客名未設定'}</div>
                      </div>
                      <div className="text-right">
                        {order.payment_status === 'cancelled' ? (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">キャンセル</span>
                        ) : order.shipped ? (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">発送済み</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">未発送</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">注文日:</span>
                        <span className="ml-1">{order.created_at?.slice(0, 10)}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${order.payment_status === 'cancelled' ? 'text-red-600 line-through' : ''}`}>
                          {formatYen(order.total_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">配送:</span>
                        <span className="ml-1">{order.dispatch_date || '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">時間:</span>
                        <span className="ml-1">{order.dispatch_time || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* PC用テーブル表示 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">注文ID</th>
                    <th className="px-2 py-1 text-left">顧客名</th>
                    <th className="px-2 py-1 text-left">ステータス</th>
                    <th className="px-2 py-1 text-left">注文日</th>
                    <th className="px-2 py-1 text-left">合計金額</th>
                    <th className="px-2 py-1 text-left">配送日</th>
                    <th className="px-2 py-1 text-left">配送時間</th>
                    <th className="px-2 py-1 text-left">発送状況</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-4">注文がありません</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="px-2 py-1 text-left">{order.id.slice(0, 8)}...</td>
                      <td className="px-2 py-1 text-left">{order.customer_name || '-'}</td>
                      <td className="px-2 py-1 text-left">
                        {order.payment_status === 'cancelled' ? (
                          <span className="text-red-600 font-semibold">キャンセル済み</span>
                        ) : (
                          <span className="text-green-600">受付中</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-left">{order.created_at?.slice(0, 10)}</td>
                      <td className={`px-2 py-1 text-left ${order.payment_status === 'cancelled' ? 'text-red-600 line-through' : ''}`}>
                        {formatYen(order.total_price)}
                      </td>
                      <td className="px-2 py-1 text-left">{order.dispatch_date || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.dispatch_time || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.shipped ? '発送済み' : '未発送'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* ページ送りボタン */}
            <div className="flex justify-center sm:justify-end gap-2 mt-3">
              <button
                className="px-3 py-2 border border-[#887c5d]/30 rounded-lg disabled:opacity-50 hover:bg-[#f5f2ea] transition-colors font-medium text-sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >← 前へ</button>
              <span className="px-3 py-2 text-sm">ページ {page + 1}</span>
              <button
                className="px-3 py-2 border border-[#887c5d]/30 rounded-lg disabled:opacity-50 hover:bg-[#f5f2ea] transition-colors font-medium text-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={orders.length < PAGE_SIZE}
              >次へ →</button>
            </div>
          </>
        )}
      </div>

      {/* マーケティング／分析セクション */}
      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">マーケティング／分析</h2>
        {/* 粒度・期間切り替え */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4">
            <div className="col-span-3 sm:col-auto">
              <label className="block text-xs sm:text-sm text-gray-600 mb-1">粒度</label>
              <select value={salesPeriod} onChange={e => setSalesPeriod(e.target.value as 'daily' | 'monthly')} className="w-full border border-[#887c5d]/30 rounded-lg px-2 py-2 text-xs sm:text-sm bg-white hover:bg-[#f5f2ea] transition-colors focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20">
                <option value="daily">日別</option>
                <option value="monthly">月別</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1">開始日</label>
              <input type="date" value={salesFrom} onChange={e => setSalesFrom(e.target.value)} className="w-full border border-[#887c5d]/30 rounded-lg px-2 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1">終了日</label>
              <input type="date" value={salesTo} onChange={e => setSalesTo(e.target.value)} className="w-full border border-[#887c5d]/30 rounded-lg px-2 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#887c5d]/20" />
            </div>
          </div>
        </div>
        {salesLoading ? (
          <p>読み込み中...</p>
        ) : salesError ? (
          <p className="text-red-500">{salesError}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={240} className="sm:hidden">
                <BarChart data={salesStats} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} labelStyle={{ color: '#374151' }} contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ color: '#374151', fontSize: '12px' }} />
                  <Bar dataKey="totalSales" name="売上" fill="#887c5d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orderCount" name="注文数" fill="#d4c5a9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={320} className="hidden sm:block">
                <BarChart data={salesStats} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} labelStyle={{ color: '#374151' }} contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ color: '#374151' }} />
                  <Bar dataKey="totalSales" name="売上合計" fill="#887c5d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orderCount" name="注文数" fill="#d4c5a9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

    </div>
  );
} 