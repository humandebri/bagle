'use client';

import Link from "next/link"
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
    { name: 'HOME', href: '/' },
    {name: 'MENU',href: '/menu'},
    { name: 'ACCESS', href: '/access' },
    { name: 'SHOP', href: '/online-shop' },
];
  


export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="relative z-10 flex justify-center items-center h-16 px-4 text-gray-300 bg-[#887c5d]/70">
      <div className="flex space-x-8 sm:text-[18px]">
      {links.map((link) => {
          return (
            <Link
              key={link.name}
              href={link.href}
              className={clsx('hover:text-gray-700','transition',
                { 
                    'text-gray-50': pathname === link.href,
                })}
            >
              <p>{link.name}</p>
            </Link>
          );
        })}
      </div>
    </nav>
  )
}
