// BagelCard.tsx（全体コードを差し替え）
'use client';

import Image from 'next/image';

export type Bagel = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  image?: string;
  tags: string[];
};

export default function BagelCard({ bagel }: { bagel: Bagel }) {
  return (
    /* ▲ 3fr : 1fr で分割するグリッドを作る */
    <div className="grid grid-cols-[2fr_1fr] md:grid-cols-[5fr_3fr]  border-b  md:border  h-full">
      {/* ------- 左 3fr ------- */}
      <div className="flex flex-col p-4">
        <h4 className="text-2xl text-gray-400 mb-2">{bagel.name}</h4>

        <p className=" text-gray-400 mb-4 leading-relaxed flex-grow">
          {bagel.description}
        </p>
{/* 
        <div className="flex space-x-1 mb-2">
          {bagel.tags.includes('vegetarian') && (
            <Tag label="VG" color="lime-500" tooltip="ベジタリアン" />
          )}
          {bagel.tags.includes('vegan') && (
            <Tag label="V" color="green-500" tooltip="ヴィーガン" />
          )}
        </div> */}

        <p className="text-xl text-gray-400">
          ¥ {bagel.price.toLocaleString()}
        </p>
      </div>

      {/* ------- 右 1fr ------- */}
      <div className="flex items-center ">
        <div className="relative w-full aspect-square rounded-full overflow-hidden">
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
  'lime-500': 'border-lime-500 text-lime-500',
  'green-500': 'border-green-500 text-green-500',
};

export function Tag({
  label,
  color,
  tooltip,
}: {
  label: string;
  color: keyof typeof colorMap;
  tooltip: string;
}) {
  return (
    <div className="relative group">
      <div
        className={`rounded-full border w-6 h-6 flex items-center justify-center cursor-pointer ${colorMap[color]}`}
      >
        <span className="text-xs">{label}</span>
      </div>
      <div className="absolute invisible group-hover:visible bg-black/80 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap -top-8 left-1/2 -translate-x-1/2">
        {tooltip}
      </div>
    </div>
  );
}
