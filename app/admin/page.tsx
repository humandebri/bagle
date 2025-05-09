'use client';

import { 
  CubeIcon, 
  TagIcon, 
  FolderIcon, 
  ShoppingCartIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AdminDashboard() {
  const stats = [
    {
      name: '商品数',
      value: '10',
      icon: CubeIcon,
      href: '/admin/products',
    },
    {
      name: 'カテゴリー数',
      value: '5',
      icon: FolderIcon,
      href: '/admin/categories',
    },
    {
      name: 'タグ数',
      value: '8',
      icon: TagIcon,
      href: '/admin/tags',
    },
    {
      name: '注文数',
      value: '25',
      icon: ShoppingCartIcon,
      href: '/admin/orders',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ダッシュボード</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近の注文</h2>
          <p className="text-gray-600">まだ実装されていません</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">在庫アラート</h2>
          <p className="text-gray-600">まだ実装されていません</p>
        </div>
      </div>
    </div>
  );
} 