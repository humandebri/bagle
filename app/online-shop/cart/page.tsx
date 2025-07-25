'use client';

import { useCartStore } from '@/store/cart-store';
import { Minus, Plus } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { MAX_BAGEL_PER_ITEM } from "@/lib/constants";




export default function CartPage() {
    
  const items = useCartStore((state) => state.items); 
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0); 
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const router = useRouter();
  const close = () => {
    router.push('/online-shop');
  };

  const handleCheckout = () => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity > 8) {
      toast.error("予約できる個数は最大8個までです！", {
        description: "お一人様8個までご予約いただけます。",
      });
      return;
    }

    if (totalQuantity === 0) {
      toast.error("カートに商品がありません。", {
        description: "商品を追加してください。",
      });
      return;
    }


    router.push('/online-shop/checkout');
  };

  return (
    <>
    <main className="min-h-[calc(100vh-7rem)] pb-20 md:pb-5 px-6 py-10 bg-white">
      <h1 className="text-3xl  mb-8">Cart </h1>
      <button
          onClick={close}
          className="absolute top-25 right-4 text-3xl text-gray-400 hover:text-black md:hidden"
          aria-label="閉じる"
        >
          ✕
        </button>

      {/* 商品リスト */}
      {items.length > 0 ? (
        <div className="space-y-6">
          {items.filter(item => item.quantity > 0).map((item) => (
            <div key={item.id} className="flex justify-between border-b border-[#887c5d]/60  pb-4">
                {/* 左側：商品情報 */}
                <div>
                <p className="text-lg">{item.name}</p>
                <button onClick={() => removeItem(item.id)} className="pt-5 text-[#887c5d] hover:underline">
                    削除
                </button>
                </div>

                {/* 右側：金額と数量ボタン */}
                <div className="flex flex-col items-end gap-2">
                {/* 金額 */}
                <div className="text-lg">
                    ¥{(item.price * item.quantity).toLocaleString()}
                </div>

                {/* 数量ボタン */}
                <div className="flex items-center border-2 border-[#887c5d]/60 w-35 h-10">
                <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="flex-1 flex justify-center items-center">
                <Minus className="w-5 h-5" />
                </button>

                <span className="flex-1 text-center text-xl text-gray-400">{item.quantity}</span>

                <button onClick={() => {
                  if (item.quantity >= MAX_BAGEL_PER_ITEM) {
                    toast.error(`1つの商品は最大${MAX_BAGEL_PER_ITEM}個までです！`, {
                      description: `お一人様1つの商品につき${MAX_BAGEL_PER_ITEM}個までご予約いただけます。`,
                    });
                    return;
                  }
                  updateQuantity(item.id, item.quantity + 1);
                }} className="flex-1 flex justify-center items-center">
                <Plus className="w-5 h-5" />
                </button>
                </div>
                </div>
            </div>
            ))}
                    

          {/* 合計金額 */}
          <div className="flex justify-between text-xl mt-6">
            <p>合計</p>
            <p>¥{totalAmount.toLocaleString()}</p>
          </div>

        <div className="hidden md:flex justify-end mt-8">
            <button
                onClick={handleCheckout}
                className="flex-shrink-0 w-64 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
            >
                注文 ¥{totalAmount.toLocaleString()}
            </button>
          </div>
        </div>
      ) : (
        <p >カートに商品がありません。</p>
      )}
    </main>
        <div className="fixed bottom-0 z-20 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={handleCheckout}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          お支払いへ進む
        </button>
      </div>
    </>
  );
}
