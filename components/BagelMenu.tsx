"use client";

import Link from "next/link";
import BagelCard, { Bagel } from "./BagelCard";

type Props = { bagels: Bagel[] };

export default function BagelMenu({ bagels }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-6">
      {bagels.map((b) => (
        <Link
          key={b.id}
          href={`/online-shop/${b.id}`}
          scroll={false}
          className="text-left block h-full"
        >
          <BagelCard bagel={b} />
        </Link>
      ))}
    </div>
  );
}