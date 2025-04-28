"use client";

import { useRouter } from "next/navigation";
import BagelCard, { Bagel } from "./BagelCard";

type Props = { bagels: Bagel[] };

export default function BagelMenu({ bagels }: Props) {
  const router = useRouter();

  const openModal = (id: number) =>
    router.push(`/online-shop?modal=bagel&id=${id}`, { scroll: false });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {bagels.map((b) => (
        <button key={b.id} onClick={() => openModal(b.id)} className="text-left">
          <BagelCard bagel={b} />
        </button>
      ))}
    </div>
  );
}
