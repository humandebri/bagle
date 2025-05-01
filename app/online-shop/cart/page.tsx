'use client';

import { useCartStore } from '@/store/cart-store';
import { Minus, Plus } from "lucide-react";
import { useRouter } from 'next/navigation';




export default function CartPage() {
    
  const items = useCartStore((state) => state.items); 
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalAmount = totalAmount + 10; 
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  const router = useRouter();
  const close = () => {
  router.push('/online-shop');
    };

  return (
    <>
    <main className="min-h-[calc(100vh-7rem)] px-6 py-10 bg-white">
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
          {items.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-[#887c5d]/60  pb-4">
                {/* 左側：商品情報 */}
                <div>
                <p className="text-lg">{item.name}</p>
                <button onClick={() => removeFromCart(item.id)} className="pt-5 text-[#887c5d] hover:underline">
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
                <button onClick={() => decreaseQuantity(item.id)} className="flex-1 flex justify-center items-center">
                <Minus className="w-5 h-5" />
                </button>

                <span className="flex-1 text-center text-xl text-gray-400">{item.quantity}</span>

                <button onClick={() => increaseQuantity(item.id)} className="flex-1 flex justify-center items-center">
                <Plus className="w-5 h-5" />
                </button>
                </div>
                </div>
            </div>
            ))}
                    

          {/* 合計金額 */}
          <div className="flex justify-between  text-xl ">
            <p>袋代</p>
            <p>¥10</p>
          </div>
          <div className="flex -mt-2 justify-between text-xl ">
            <p>合計</p>
            <p>¥{finalAmount.toLocaleString()}</p>
          </div>

        <div className="hidden md:flex justify-end mt-8">
            <button
                onClick={() => router.push('/online-shop/checkout')}
                className="flex-shrink-0 w-64 py-4 px-6 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
            >
                注文 ¥{finalAmount.toLocaleString()}
            </button>
          </div>
        </div>
      ) : (
        <p >カートに商品がありません。</p>
      )}
    </main>
        <div className="fixed bottom-0 z-20 w-full max-w-md px-6 py-3 border-t border-gray-300 bg-white md:hidden">
        <button
          onClick={() => router.push('/online-shop/checkout')}
          className="w-full py-3 bg-[#887c5d] text-gray-200 text-lg hover:bg-gray-600"
        >
          お支払いへ進む
        </button>
      </div>
    </>
  );
}
