"use client";

import Link from "next/link";
import BagelCard, { Bagel } from "./BagelCard";

type Props = { bagels: Bagel[]; link?: boolean };

export default function BagelMenu({ bagels, link = true }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-6">
      {bagels.map((b) => (
        link ? (
          <Link
            key={b.id}
            href={`/online-shop/${b.id}`}
            scroll={false}
            className="text-left block h-full"
          >
            <BagelCard bagel={b} />
          </Link>
        ) : (
          <div key={b.id} className="text-left block h-full">
            <BagelCard bagel={b} />
          </div>
        )
      ))}
    </div>
  );
}