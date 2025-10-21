'use client';

import Link from "next/link";
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { User } from 'lucide-react';

const links = [
  { name: 'HOME', href: '/' },
  { name: 'ACCESS', href: '/access' },
  { name: 'ORDER', href: '/online-shop' },
  { name: 'ACCOUNT', href: '/account' },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHomepage = pathname === '/';
  
  // 印刷ページでは表示しない
  if (pathname?.startsWith('/print/')) {
    return null;
  }

  return (
    <nav className={clsx(
      "flex justify-center items-center h-16 px-4 z-50",
      isHomepage ? "absolute top-0 left-0 right-0 bg-transparent text-white" : "relative z-10 text-gray-300 bg-[#887c5d]/70"
    )}>
      <div className="flex space-x-8 text-xl sm:text-2xl">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            prefetch={false}
            className={clsx(
              'transition',
              isHomepage ? 'hover:text-gray-300' : 'hover:text-gray-700',
              {
                'text-gray-50': pathname === link.href && !isHomepage,
                'text-white font-semibold': pathname === link.href && isHomepage,
              }
            )}
          >
            {/* --- 通常はテキスト、ACCOUNTだけアイコン --- */}
            {link.name === 'ACCOUNT' ? (
              <User className="w-6 h-6" />
            ) : (
              <p>{link.name}</p>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
