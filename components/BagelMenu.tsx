"use client";

import Link from "next/link";
import BagelCard, { Bagel } from "./BagelCard";

type Props = { bagels: Bagel[] };

export default function BagelMenu({ bagels }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {bagels.map((b) => (
        <Link
          key={b.id}
          href={`/online-shop/${b.id}`} // ここで「通常パス」に自然リンク！
          scroll={false}                // スクロール位置そのままにする
          className="text-left block"    // buttonではなくLinkに変更
        >
          <BagelCard bagel={b} />
        </Link>
      ))}
    </div>
  );
}
