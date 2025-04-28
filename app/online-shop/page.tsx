'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore }            from '@/store/cart-store';
import { ShoppingBag }             from 'lucide-react';
import BagelMenu                   from '@/components/BagelMenu';
import BagelModal                  from '@/components/BagelModal';
import { sampleBagels }            from '@/lib/sampleBagels';

export default function OnlineShop() {
  /* --- URL パラメータ処理 ----------------------- */
  const sp        = useSearchParams();
  const router    = useRouter();
  const idParam   = sp.get('id');
  const showModal = sp.get('modal') === 'bagel' && idParam;   // ←★ 変数名を統一
  const bagel     = sampleBagels.find(b => b.id === Number(idParam));

  /* --- カート情報 ------------------------------- */
  const cartItems     = useCartStore(s => s.items);
  const totalQuantity = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  /* --- 画面 ------------------------------------ */
  return (
    <main className="min-h-[calc(100vh-7rem)]">
      {/* ---------- 通常ページ ---------- */}
      <div className="relative z-10 mx-auto mt-5 bg-white text-black p-6 rounded-sm">
        <div className="bg-gray-100 p-3 mb-6 text-center">
          <p className="text-sm">お持ち帰り、できるだけ早く（明日） 変更</p>
        </div>

        <div className="flex border-b mb-8">
          <div className="w-1/2 pb-2 border-b-2">
            <button className="font-medium text-2xl  text-gray-400">BAGEL</button>
          </div>
        </div>

        {/* ←★ BagelMenu をここで描画してから div を閉じる */}
        <BagelMenu bagels={sampleBagels} />
      </div>

      {/* ---------- モーダル ---------- */}
      {showModal && bagel && (
        <BagelModal
          bagel={bagel}
          onClose={() => router.push('/online-shop', { scroll: false })}
        />
      )}

      {/* ---------- フッター ---------- */}
      {!showModal && (
        <CartFooter
          totalQuantity={totalQuantity}
          onClick={() => router.push('/online-shop/cart')}
        />
      )}
    </main>
  );
}

/* --- フッターを別コンポーネントに分離 --- */
function CartFooter({
  totalQuantity,
  onClick,
}: {
  totalQuantity: number;
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-0 w-full bg-white flex justify-center z-30 border-t border-gray-300">
      <div className="w-full max-w-md px-6 py-7">
        <button
          onClick={onClick}
          className="w-full relative py-5 bg-[#887c5d] text-gray-200 hover:bg-gray-600 text-xl flex items-center justify-center"
          aria-label="カートを見る"
        >
          カートを見る
          <div className="flex absolute right-6">
            <ShoppingBag className="h-5 w-5" />
            {totalQuantity > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center text-sm">
                {totalQuantity}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
