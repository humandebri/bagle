'use client';

import { 
  CubeIcon, 
  TagIcon, 
  FolderIcon, 
  ShoppingCartIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  items: any[];
  dispatch_date: string;
  dispatch_time: string;
  total_price: number;
  payment_status: string;
  shipped: boolean;
  customer_name?: string;
  phone?: string;
}

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
  const [salesStats, setSalesStats] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'monthly'>('daily');
  const [salesFrom, setSalesFrom] = useState<string>('');
  const [salesTo, setSalesTo] = useState<string>('');

  // 商品数・カテゴリー数・注文数・時間枠数をAPIから取得
  const [productCount, setProductCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [timeSlotCount, setTimeSlotCount] = useState<number>(0);

  const fetchCounts = useCallback(async (from: string, to: string) => {
    // 商品数・カテゴリー数
    const productsRes = await fetch(`/api/products?from=${from}&to=${to}`);
    const products = await productsRes.json();
    setProductCount(Array.isArray(products) ? products.length : 0);
    // カテゴリー数（重複除外）
    const categorySet = new Set(
      Array.isArray(products)
        ? products.map((p: any) => p.category?.name).filter((v: string | undefined) => !!v)
        : []
    );
    setCategoryCount(categorySet.size);
    // 注文数
    const summaryRes = await fetch(`/api/admin/summary?from=${from}&to=${to}`);
    const summary = await summaryRes.json();
    setOrderCount(summary.orderCount ?? 0);
    // 時間枠数
    const timeSlotsRes = await fetch(`/api/time_slots?from=${from}&to=${to}`);
    const timeSlotsJson = await timeSlotsRes.json();
    setTimeSlotCount(Array.isArray(timeSlotsJson.timeSlots) ? timeSlotsJson.timeSlots.length : 0);
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
  }, []);

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
      } catch (e: any) {
        setError(e.message);
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
      } catch (e: any) {
        setOrderError(e.message);
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
      } catch (e: any) {
        setSalesError(e.message);
      } finally {
        setSalesLoading(false);
      }
    };
    if (salesFrom && salesTo) fetchSales();
  }, [salesPeriod, salesFrom, salesTo]);



  return (
    <div>

      
      {/* 期間指定フォーム */}
      <div className="mb-6 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600">開始日</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">終了日</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded px-2 py-1" />
          </div>
        </div>
        <div className="flex gap-6 items-end text-gray-700 text-base font-medium">
          <div>商品数 <span className="font-bold text-gray-900">{productCount}</span></div>
          <div>カテゴリー数 <span className="font-bold text-gray-900">{categoryCount}</span></div>
          <div>注文数 <span className="font-bold text-gray-900">{orderCount}</span></div>
          <div>時間枠数 <span className="font-bold text-gray-900">{timeSlotCount}</span></div>
        </div>
      </div>

      {/* KPIセクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">概要（KPI）</h2>
        {loading ? (
          <p>読み込み中...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : kpi ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">売上合計</p>
              <p className="text-xl font-bold">{formatYen(kpi.totalSales)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">注文数</p>
              <p className="text-xl font-bold">{kpi.orderCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">新規顧客数 / リピーター数</p>
              <p className="text-xl font-bold">{kpi.newCustomers} / {kpi.repeatCustomers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">平均注文額（AOV）</p>
              <p className="text-xl font-bold">{formatYen(kpi.aov)}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* 注文状況セクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h2 className="text-lg font-semibold text-gray-900">注文状況</h2>
          <div className="flex items-center">
            <label className="mr-2 text-sm text-gray-600">注文ステータス:</label>
            <select
              value={orderStatus}
              onChange={e => { setOrderStatus(e.target.value); setPage(0); }}
              className="border rounded px-2 py-1"
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">注文ID</th>
                    <th className="px-2 py-1 text-left">顧客名</th>
                    <th className="px-2 py-1 text-left">電話番号</th>
                    <th className="px-2 py-1 text-left">注文日</th>
                    <th className="px-2 py-1 text-left">合計金額</th>
                    <th className="px-2 py-1 text-left">配送日</th>
                    <th className="px-2 py-1 text-left">配送時間</th>
                    <th className="px-2 py-1 text-left">発送状況</th>
                    <th className="px-2 py-1 text-left">決済状況</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">注文がありません</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="px-2 py-1 text-left">{order.id.slice(0, 8)}...</td>
                      <td className="px-2 py-1 text-left">{order.customer_name || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.phone || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.created_at?.slice(0, 10)}</td>
                      <td className="px-2 py-1 text-left">{formatYen(order.total_price)}</td>
                      <td className="px-2 py-1 text-left">{order.dispatch_date || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.dispatch_time || '-'}</td>
                      <td className="px-2 py-1 text-left">{order.shipped ? '発送済み' : '未発送'}</td>
                      <td className="px-2 py-1 text-left">{
                        order.payment_status === 'confirmed'
                          ? '成功'
                          : (order.payment_status === 'canceled' || order.payment_status === 'cancelled')
                            ? 'キャンセル'
                            : '未決済'
                      }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* ページ送りボタン */}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >←</button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage(p => p + 1)}
                disabled={orders.length < PAGE_SIZE}
              >→</button>
            </div>
          </>
        )}
      </div>

      {/* マーケティング／分析セクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">マーケティング／分析</h2>
        {/* 粒度・期間切り替え＋ページ送りボタンを同じ行に */}
        <div className="flex flex-wrap gap-4 items-end mb-4 justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-600">粒度</label>
              <select value={salesPeriod} onChange={e => setSalesPeriod(e.target.value as 'daily' | 'monthly')} className="border rounded px-2 py-1">
                <option value="daily">日別</option>
                <option value="monthly">月別</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600">開始日</label>
              <input type="date" value={salesFrom} onChange={e => setSalesFrom(e.target.value)} className="border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">終了日</label>
              <input type="date" value={salesTo} onChange={e => setSalesTo(e.target.value)} className="border rounded px-2 py-1" />
            </div>
          </div>
          {/* ここにページ送りボタン等を追加したい場合はこのdivの中に配置 */}
        </div>
        {salesLoading ? (
          <p>読み込み中...</p>
        ) : salesError ? (
          <p className="text-red-500">{salesError}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={salesStats} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={v => v.toLocaleString()} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} labelStyle={{ color: '#374151' }} contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ color: '#374151' }} />
              <Bar dataKey="totalSales" name="売上合計" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="orderCount" name="注文数" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
} 