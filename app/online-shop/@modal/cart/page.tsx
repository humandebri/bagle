"use client";

import { useCartStore } from "@/store/cart-store";
import { useRouter } from "next/navigation";

export default function CartModal() {
  const router = useRouter();
  const { items } = useCartStore();

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg overflow-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl">注文数 ({items.length})</h1>
          <button onClick={() => router.back()} className="text-2xl">✕</button>
        </div>
        {/* あとはさっきのカートリストをここに書けばOK */}
      </div>
    </div>
  );
}
