'use client';

import Image from 'next/image';

export type Bagel = {
  id: string | number;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  image?: string;
  tags: string[];
};

export default function BagelCard({ bagel }: { bagel: Bagel }) {
  return (
    <div className="flex border-b pb-6">
      {/* ------- 左側 ------- */}
      <div className="w-2/3 pr-4">
        <h4 className="text-2xl text-gray-400 mb-2">{bagel.name}</h4>

        <p className="text-xl text-gray-400 mb-4 leading-relaxed">
          {bagel.description}
        </p>

        {/* タグ */}
        <div className="flex space-x-1 mb-2">
          {bagel.tags.includes('vegetarian') && (
            <Tag label="VG" color="lime-500" tooltip="ベジタリアン" />
          )}
          {bagel.tags.includes('vegan') && (
            <Tag label="V" color="green-500" tooltip="ヴィーガン" />
          )}
        </div>

        <p className="text-xl text-gray-400">¥ {bagel.price.toLocaleString()}</p>
      </div>

      {/* ------- 右側 ------- */}
      <div className="w-1/3">
        <div className="relative h-24 w-24 rounded-full overflow-hidden">
          <Image
            src={bagel.image ?? '/placeholder.svg'}
            alt={bagel.name}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}

/* 内部ユーティリティ */
const colorMap = {
  "lime-500": "border-lime-500 text-lime-500",
  "green-500": "border-green-500 text-green-500",
  // 必要な色をここに追加
};

export function Tag({ label, color, tooltip }: { label: string; color: keyof typeof colorMap; tooltip: string }) {
  return (
    <div className="relative group">
      <div className={`rounded-full border w-6 h-6 flex items-center justify-center cursor-pointer ${colorMap[color]}`}>
        <span className="text-xs">{label}</span>
      </div>
      <div className="absolute invisible group-hover:visible bg-black/80 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap -top-8 left-1/2 -translate-x-1/2">
        {tooltip}
      </div>
    </div>
  );
}