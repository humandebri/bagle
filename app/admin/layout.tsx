'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  HomeIcon, 
  FolderIcon, 
  CubeIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin') {
      router.push('/account');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="p-8 text-center">ロード中...</div>;
  }

  if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin') {
    return null;
  }

  const menuItems = [
    { name: 'ダッシュボード', href: '/admin', icon: HomeIcon },
    { name: '商品管理', href: '/admin/products', icon: CubeIcon },
    { name: 'カテゴリー管理', href: '/admin/categories', icon: FolderIcon },
    { name: '注文管理', href: '/admin/orders', icon: ShoppingCartIcon },
    // { name: 'タグ管理', href: '/admin/tags', icon: TagIcon },
    { name: '予約管理', href: '/admin/reservations', icon: CalendarIcon },
    { name: '時間枠管理', href: '/admin/time_slots', icon: CalendarIcon },
    { name: '営業日カレンダー', href: '/admin/business-calendar', icon: CalendarDaysIcon },
  ];

  

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* サイドバー */}
        <div className="w-16 md:w-64 min-h-screen bg-white shadow-sm">
          <div className="p-4">
            <h1 className="text-xl font-bold text-gray-800 hidden md:block">管理画面</h1>
          </div>
          <nav className="mt-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <item.icon className="w-5 h-5 md:mr-3" />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 